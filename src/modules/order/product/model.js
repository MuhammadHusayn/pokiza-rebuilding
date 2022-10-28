import { BadRequestError, BadUserInputError, ForbiddenError } from '#errors'
import { setMonitoring } from '#helpers/monitoring'
import { fetch, fetchAll } from '#utils/postgres'
import changeStatus from '#helpers/status'
import TransportQuery from '#sql/transport'
import ProductQuery from '#sql/product'
import ServiceQuery from '#sql/service'
import OrderQuery from '#sql/order'


const products = ({
	sort,
	search,
	isPaid,
	orderId,
	branchId,
	clientId,
	productId,
	isDeleted,
	serviceId,
	pagination,
	dateFilter,
	transportId,
	productPrice,
	productStatus,
	addressFilter,
	productSpecial
}, user) => {
	const sortNameValues = { 
		productId: 1, productStatus: 2, productPrice: 3, 
		addressDistance: 4, firstName: 5, lastName: 6, 
		orderId: 7, broughtTime: 8, deliveredTime: 9, bringTime: 10, deliveryTime: 11 
	}

	const sortObject = Object.keys(sort).map(key => {
		if(sort[key]) {
			return { sortKey: sortNameValues[key], value: sort[key] }
		}
	}).filter( elem => elem !== undefined )[0]

	Object.keys(dateFilter).map(key => {
		dateFilter[key] = [dateFilter[key].from, dateFilter[key].to]
	})

	productPrice = (productPrice?.from && productPrice?.to) ? [productPrice.from, productPrice.to] : []

	if(user.clientId) {
		clientId = [user.clientId]
	}

	branchId = Array.prototype.equalize(branchId, user.allowedBranches)

	const { page, limit } = pagination
	const { stateId, regionId, neighborhoodId, streetId, areaId } = addressFilter
	const { bringTime, broughtTime, deliveryTime, deliveredTime, productCreatedAt } = dateFilter

	return fetchAll(
		ProductQuery.PRODUCTS,
		(page - 1) * limit, limit, isDeleted,
		productId, orderId, clientId, branchId, serviceId, productStatus, productPrice, productSpecial, search,
		bringTime, broughtTime, deliveryTime, deliveredTime, productCreatedAt,
		stateId, regionId, neighborhoodId, streetId, areaId, transportId, isPaid,
		sortObject?.sortKey || 1, sortObject?.value || 1
	)
}

const service = ({ serviceId, isDeleted = null }) => {
	return fetch(ServiceQuery.SERVICES, isDeleted, serviceId, [])
}

const productStatuses = ({ productId }) => {
	return fetchAll(ProductQuery.PRODUCT_STATUSES, productId)
}

const order = ({ orderId }) => {
	return fetch(OrderQuery.ORDER, null, orderId, [])
}

const transport = ({ productId }) => {
	return fetch(TransportQuery.TRANSPORT, null, 0, 0, 0, productId)
}

const orderBindings = async ({ productId }) => {
	return await fetchAll(OrderQuery.ORDER_BINDINGS, 0, productId)
}

const addProduct = async ({ orderId, serviceId, file, productSizeDetails, productSummary }, { staffId }) => {
	if(typeof productSizeDetails !== 'object' || Array.isArray(productSizeDetails)) {
		throw new BadUserInputError("productSizeDetails should be a valid javaScript object type")
	}

	const productService = await service({ serviceId, isDeleted: false })
	if(!productService) {
		throw new BadRequestError("Bunday xizmat turi mavjud emas!")
	} else if(
		!productService?.service_unit_keys?.map(key => {
			return Object.keys(productSizeDetails).includes(key) && typeof(productSizeDetails[key]) === 'number'
		}).every(el => el ===  true)
	) {
		throw new BadUserInputError(`The keys ${productService?.service_unit_keys} must be present inside productSizeDetails and they should be number!`)
	}

	const productOrder = await order({ orderId })
	if(productOrder && productOrder.branch_id != productService.branch_id) {
		throw new ForbiddenError("Bu xizmat buyurtma berilgan filialda ishlamaydi!")
	}

	const productSize = Object.values(productSizeDetails).reduce((acc, el) => acc * el)

	return fetch(ProductQuery.ADD_PRODUCT, orderId, serviceId, file, productSizeDetails, productSize, productSummary, staffId)
}

const changeProduct = async ({ productId, serviceId, file, productSizeDetails, productSummary }, { userId }) => {
	if(serviceId && (!productSizeDetails || typeof productSizeDetails !== 'object' || Array.isArray(productSizeDetails))) {
		throw new BadUserInputError("productSizeDetails should be a valid javaScript object type")
	}

	if(serviceId) {
		const productService = await service({ serviceId, isDeleted: false })
		if(!productService) {
			throw new BadRequestError("Bunday xizmat turi mavjud emas!")
		} else if(
			!productService.service_unit_keys?.map(key => {
				return Object.keys(productSizeDetails).includes(key) && typeof(productSizeDetails[key]) === 'number'
			}).every(el => el ===  true)
		) {
			throw new BadUserInputError(`The keys ${productService?.service_unit_keys} must be present inside productSizeDetails and they should be number!`)
		}
	}

	const productSize = productSizeDetails ? Object.values(productSizeDetails).reduce((acc, el) => acc * el) : undefined

	const updatedProduct = await fetch(ProductQuery.CHANGE_PRODUCT, productId, serviceId, file, productSizeDetails, productSize, productSummary)

	if(updatedProduct) setMonitoring({ 
		userId, 
		sectionId: productId,
		sectionName: 'products', 
		operationType: 'changed',
		branchId: updatedProduct.branch_id,
	}, updatedProduct)

	return updatedProduct
}

const changeProductStatus = async ({ productId, status, staffId }) => {
	if(status > 10) {
		throw new ForbiddenError("Buyumni bu holatga o'tkazish mumkin emas!")
	}

	const statuses = await productStatuses({ productId })
	const productStatus = +statuses[statuses.length - 1].status_code

	if(status == productStatus) {
		throw new BadRequestError("Buyurtma holati allaqachon yangilangan!")
	}

	const updatedStatus = await fetch(ProductQuery.CHANGE_PRODUCT_STATUS, productId, status, staffId)

	await changeStatus({ productId, staffId })

	return updatedStatus
}

const deleteProduct = async ({ productId }, { userId }) => {
	productId.map(async id => {
		const statuses = await productStatuses({ productId: id })
		if(+statuses[statuses.length - 1].status_code > 6) {
			throw new ForbiddenError("Buyumni o'chirish mumkin emas!")
		}
	})

	const deletedProducts = []
	for(let id of productId) {
		const deletedProduct = await fetch(ProductQuery.DELETE_PRODUCT, id)
		if(deletedProduct) {
			deletedProducts.push(deletedProduct)

			setMonitoring({ 
				userId, 
				sectionId: id,
				sectionName: 'products', 
				operationType: 'deleted',
				branchId: deletedProduct.branch_id,
			}, deletedProduct)
		} 
	}
	return deletedProducts
}

const restoreProduct = async ({ productId }, { userId }) => {
	const restoredProducts = []
	for(let id of productId) {
		const restoredProduct = await fetch(ProductQuery.RESTORE_PRODUCT, id)
		if(restoredProduct) {
			restoredProducts.push(restoredProduct)

			setMonitoring({ 
				userId, 
				sectionId: id,
				sectionName: 'products', 
				operationType: 'restored',
				branchId: restoredProduct.branch_id,
			}, restoredProduct)
		}
	}
	return restoredProducts
}


export default {
	changeProductStatus,
	productStatuses,
	restoreProduct,
	orderBindings,
	deleteProduct,
	changeProduct,
	addProduct,
	transport,
	products,
	service,
	order,
}
