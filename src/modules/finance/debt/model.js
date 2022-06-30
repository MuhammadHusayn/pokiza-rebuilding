import { setMonitoring } from '#helpers/monitoring'
import { fetch, fetchAll } from '#utils/postgres'
import { BadRequestError } from '#errors'
import DebtTransactionQuery from '#sql/debtTransaction'
import BalanceQuery from '#sql/balance'
import BranchQuery from '#sql/branch'
import UserQuery from '#sql/user'

const debtTransactions = ({ 
	branchId,
	moneyType,
	pagination,
	dateFilter,
	moneyAmount,
	transactionId,
	transactionTo,
	transactionFrom,
	transactionType,
	transactionStatus,
 }, user) => {
	dateFilter = dateFilter ? [dateFilter.from, dateFilter.to] : []
	branchId = Array.prototype.equalize(branchId, user.allowedBranches)
	const { page, limit } = pagination

	return fetchAll(
		DebtTransactionQuery.TRANSACTIONS, (page - 1) * limit, limit, transactionId,
		branchId, transactionTo, transactionFrom, moneyType, moneyAmount,
		transactionType, dateFilter, transactionStatus,
		user.personal, user.personalBranchId, user.staffId
	)
}

const equities = ({ staffId, branchId, pagination }, user) => {
	branchId = Array.prototype.equalize(branchId, user.allowedBranches)
	const { page, limit } = pagination

	return fetchAll(
		DebtTransactionQuery.EQUITIES, (page - 1) * limit, limit,
		staffId, branchId, user.personal, user.personalBranchId, user.staffId
	)
}

const staff = async ({ staffId }) => {
	const { staff } = await fetch(UserQuery.USER, false, 0, staffId, 0)
	return staff
}

const branch = ({ branchId }) => {
	return fetch(BranchQuery.BRANCHES, branchId)
}

const makeDebtTransactionIncome = async ({
	transactionTo,
	transactionFrom,
	transactionMoney,
	transactionSummary,
	transactionDateTime,
	transactionMoneyType,
}, user) => {
	const receiverBalance = await fetch(BalanceQuery.BALANCE, transactionTo, 0)

	if (!receiverBalance) {
		await fetch(BalanceQuery.CREATE_BALANCE, transactionTo)
	}

	const transaction = await fetch(DebtTransactionQuery.MAKE_TRANSACTION, transactionMoney, transactionMoneyType, transactionFrom, transactionTo, 'accepted', transactionSummary, 'income', transactionDateTime)

	const increment = await fetch(
		BalanceQuery.INCREMENT_BALANCE, transactionTo, 
		transactionMoneyType === 'cash' ? transactionMoney : 0,
		transactionMoneyType === 'card' ? transactionMoney : 0,
	)

	if (increment) return transaction
}

const makeDebtTransactionOutcome = async ({
	transactionTo,
	transactionFrom,
	transactionMoney,
	transactionSummary,
	transactionDateTime,
	transactionMoneyType,
}, user) => {
	const senderBalance = await fetch(BalanceQuery.BALANCE, transactionFrom, 0)

	if (
		(!senderBalance) ||
		(senderBalance && transactionMoneyType === 'cash' && senderBalance.balance_money_cash < transactionMoney) ||
		(senderBalance && transactionMoneyType === 'card' && senderBalance.balance_money_card < transactionMoney)
	) {
		throw new BadRequestError("Yuboruvchi kassasida yetarlicha mablag' yo'q yoki kassa hali ochilmagan!")
	}

	const transaction = await fetch(DebtTransactionQuery.MAKE_TRANSACTION, transactionMoney, transactionMoneyType, transactionFrom, transactionTo, 'pending', transactionSummary, 'outcome', transactionDateTime)
	return transaction
}

const cancelDebtTransaction = async ({ transactionId }, user) => {
	const oldTransaction = await fetch(DebtTransactionQuery.TRANSACTION, transactionId, 0, 0)

	if (oldTransaction?.transaction_status !== 'pending') {
		throw new BadRequestError("Holati 'pending' bo'lgan transaksiyalarnigina bekor qilish mumkin!")
	}

	const transaction = await fetch(DebtTransactionQuery.CANCEL_TRANSACTION, transactionId)

	const transactionBranch = await fetch(DebtTransactionQuery.TRANSACTION_BRANCH, transactionId)
	if (transaction) setMonitoring({
		userId: user.userId,
		sectionId: transactionId,
		sectionName: 'financeDebts',
		operationType: 'changed',
		branchId: transactionBranch.branch_id,
	}, {
		old_status: oldTransaction.transaction_status,
		new_status: transaction.transaction_status,
	})
	
	return transaction
}

const acceptDebtTransaction = async ({ transactionId }, user) => {
	const oldTransaction = await fetch(DebtTransactionQuery.TRANSACTION, transactionId, 0, 0)

	if (oldTransaction?.transaction_status !== 'pending') {
		throw new BadRequestError("Holati 'pending' bo'lgan transaksiyalarnigina qabul qilish mumkin!")
	}

	const senderBalance = await fetch(BalanceQuery.BALANCE, oldTransaction.transaction_from, 0)
	if (
		(!senderBalance) ||
		(senderBalance && oldTransaction.transaction_money_type === 'cash' && senderBalance.balance_money_cash < oldTransaction.transaction_money) ||
		(senderBalance && oldTransaction.transaction_money_type === 'card' && senderBalance.balance_money_card < oldTransaction.transaction_money)
	) {
		throw new BadRequestError("Yuboruvchi kassasida yetarlicha mablag' yo'q yoki kassa hali ochilmagan!")
	}

	const transaction = await fetch(DebtTransactionQuery.ACCEPT_TRANSACTION, transactionId)

	const decrement = await fetch(
		BalanceQuery.DECREMENT_BALANCE, transaction.transaction_from,
		transaction.transaction_money_type === 'cash' ? transaction.transaction_money : 0,
		transaction.transaction_money_type === 'card' ? transaction.transaction_money : 0,
	)

	const transactionBranch = await fetch(DebtTransactionQuery.TRANSACTION_BRANCH, transactionId)
	if (transaction) setMonitoring({
		userId: user.userId,
		sectionId: transactionId,
		sectionName: 'financeDebts',
		operationType: 'changed',
		branchId: transactionBranch.branch_id,
	}, {
		old_status: oldTransaction.transaction_status,
		new_status: transaction.transaction_status,
	})

	if (decrement) return transaction
}

const deleteDebtTransaction = async ({ transactionId }, user) => {
	const oldTransaction = await fetch(DebtTransactionQuery.TRANSACTION, transactionId, 0, 0)

	if (!['pending', 'accepted'].includes(oldTransaction?.transaction_status)) {
		throw new BadRequestError("Holati 'pending' yoki 'accepted' bo'lgan transaksiyalarnigina o'chirish mumkin!")
	}

	const sender = oldTransaction.transaction_type === 'income' ? oldTransaction.transaction_to : oldTransaction.transaction_from
	const senderBalance = await fetch(BalanceQuery.BALANCE, sender, 0)
	if (
		oldTransaction?.transaction_status === 'accepted' &&
		(!senderBalance) ||
		(senderBalance && oldTransaction.transaction_money_type === 'cash' && senderBalance.balance_money_cash < oldTransaction.transaction_money) ||
		(senderBalance && oldTransaction.transaction_money_type === 'card' && senderBalance.balance_money_card < oldTransaction.transaction_money)
	) {
		throw new BadRequestError("Yetarli mablag' bo'lmaganligi sababli transaksiyani o'chirib bo'lmaydi!")
	}
	
	const transaction = await fetch(DebtTransactionQuery.DELETE_TRANSACTION, transactionId)

	if (oldTransaction.transaction_status === 'accepted' && oldTransaction.transaction_type === 'income') {
		await fetch(
			BalanceQuery.DECREMENT_BALANCE, transaction.transaction_to,
			transaction.transaction_money_type === 'cash' ? transaction.transaction_money : 0,
			transaction.transaction_money_type === 'card' ? transaction.transaction_money : 0,
		)
	}
	
	if (oldTransaction.transaction_status === 'accepted' && oldTransaction.transaction_type === 'outcome') {
		await fetch(
			BalanceQuery.INCREMENT_BALANCE, transaction.transaction_from,
			transaction.transaction_money_type === 'cash' ? transaction.transaction_money : 0,
			transaction.transaction_money_type === 'card' ? transaction.transaction_money : 0,
		)
	}

	const transactionBranch = await fetch(DebtTransactionQuery.TRANSACTION_BRANCH, transactionId)
	if (transaction) setMonitoring({
		userId: user.userId,
		sectionId: transactionId,
		sectionName: 'financeDebts',
		operationType: 'changed',
		branchId: transactionBranch.branch_id,
	}, {
		old_status: oldTransaction.transaction_status,
		new_status: transaction.transaction_status,
	})
		
	return transaction
}

const changeDebtTransaction = async ({ 
	transactionId,
	transactionTo,
	transactionFrom,
	transactionMoney,
	transactionSummary,
	transactionDateTime,
	transactionMoneyType
 }, user) => {
	const oldTransaction = await fetch(DebtTransactionQuery.TRANSACTION, transactionId, 0, 0)

	if (!['pending', 'accepted'].includes(oldTransaction?.transaction_status)) {
		throw new BadRequestError("Holati 'pending' yoki 'accepted' bo'lgan transaksiyalarnigina o'zgartirish mumkin!")
	}

	if (
		(transactionTo || transactionFrom) &&
		(oldTransaction.transaction_status === 'accepted')
	) {
		throw new BadRequestError("Qabul qilingan transaksiyaning yuboruvchi va qabul qiluvchisini o'zgartirish mumkin emas!")
	}

	if (oldTransaction.transaction_status === 'accepted' && oldTransaction.transaction_type === 'income') { 
		await fetch(
			BalanceQuery.DECREMENT_BALANCE, oldTransaction.transaction_to,
			oldTransaction.transaction_money_type === 'cash' ? oldTransaction.transaction_money : 0,
			oldTransaction.transaction_money_type === 'card' ? oldTransaction.transaction_money : 0,
		)
	}

	if (oldTransaction.transaction_status === 'accepted' && oldTransaction.transaction_type === 'outcome') { 
		await fetch(
			BalanceQuery.INCREMENT_BALANCE, oldTransaction.transaction_from,
			oldTransaction.transaction_money_type === 'cash' ? oldTransaction.transaction_money : 0,
			oldTransaction.transaction_money_type === 'card' ? oldTransaction.transaction_money : 0,
		)
	}
	
	const transaction = await fetch(
		DebtTransactionQuery.UPDATE_TRANSACTION,
		transactionId, transactionTo, transactionFrom, transactionMoney, transactionMoneyType, transactionSummary, transactionDateTime
	)

	if (oldTransaction.transaction_status === 'accepted' && oldTransaction.transaction_type === 'income') {
		await fetch(
			BalanceQuery.INCREMENT_BALANCE, transaction.transaction_to,
			transaction.transaction_money_type === 'cash' ? transaction.transaction_money : 0,
			transaction.transaction_money_type === 'card' ? transaction.transaction_money : 0,
		)
	}

	if (oldTransaction.transaction_status === 'accepted' && oldTransaction.transaction_type === 'outcome') {
		await fetch(
			BalanceQuery.DECREMENT_BALANCE, transaction.transaction_from,
			transaction.transaction_money_type === 'cash' ? transaction.transaction_money : 0,
			transaction.transaction_money_type === 'card' ? transaction.transaction_money : 0,
		)
	}

	const transactionBranch = await fetch(DebtTransactionQuery.TRANSACTION_BRANCH, transactionId)
	if (transaction) setMonitoring({
		userId: user.userId,
		sectionId: transactionId,
		sectionName: 'financeDebts',
		operationType: 'changed',
		branchId: transactionBranch.branch_id,
	}, {
		old_receiver: oldTransaction.transaction_to,
		new_receiver: transaction.transaction_to,
		old_sender: oldTransaction.transaction_from,
		new_sender: transaction.transaction_from,
		old_money: oldTransaction.transaction_money,
		new_money: transaction.transaction_money,
		old_summary: oldTransaction.transaction_summary,
		new_summary: transaction.transaction_summary,
		old_date_time: oldTransaction.transaction_created_at,
		new_date_time: transaction.transaction_created_at,
		old_money_type: oldTransaction.transaction_money_type,
		new_money_type: transaction.transaction_money_type,
	})
		
	return transaction
}


export default {
	makeDebtTransactionOutcome,
	makeDebtTransactionIncome,
	changeDebtTransaction,
	deleteDebtTransaction,
	cancelDebtTransaction,
	acceptDebtTransaction,
	debtTransactions,
	equities,
	branch,
	staff,
}