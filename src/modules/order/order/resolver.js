import { BadRequestError, InternalServerError, ForbiddenError } from '#errors'
import orderModel from './model.js'

export default {
	Mutation: {
		addOrder: async (_, args, { clientId, staffId }) => {
			try {
				const newOrder = await orderModel.addOrder(args, { clientId, staffId })
				if(newOrder) {
					return {
						status: 200,
						message: "Buyurtma qabul qilindi!",
						data: newOrder
					}
				} else throw new InternalServerError("Buyurtmani qabul qilishda muammolik yuz berdi!")  
			} catch(error) { 
				throw error
			 }
		},

		changeOrder: async (_, args, { clientId, userId }) => {
			try {
				const updatedOrder = await orderModel.changeOrder(args, { clientId, userId })
				if(updatedOrder) {
					return {
						status: 200,
						message: "Buyurtma ma'lumotlari yangilandi!",
						data: updatedOrder
					}
				} else throw new ForbiddenError("Bunday buyurtma yo'q yoki buyurtmani o'zgartirishga ruxsat yo'q!")  
			} catch(error) { 
				throw error
			 }
		},

		changeOrderStatus: async (_, args, { staffId, userId }) => {
			try {
				const updatedOrder = await orderModel.changeOrderStatus({ staffId, ...args }, { userId, staffId })
				if(updatedOrder) {
					return {
						status: 200,
						message: "Buyurtma holati yangilandi!",
						data: updatedOrder
					}
				} else throw new ForbiddenError("Bunday buyurtma yo'q yoki buyurtmani o'zgartirishga ruxsat yo'q!")  
			} catch(error) { 
				throw error
			 }
		},

		deleteOrder: async (_, args, { clientId, userId }) => {
			try {
				const deletedOrders = await orderModel.deleteOrder(args, { clientId, userId })
				if(deletedOrders.length) {
					return {
						status: 200,
						message: "Buyurtmalar o'chirildi!",
						data: deletedOrders
					}
				} else throw new BadRequestError("Bunday buyurtmalar mavjud emas!")
			} catch(error) { 
				throw error
			 }
		},

		restoreOrder: async (_, args, { clientId, userId }) => {
			try {
				const restoredOrders = await orderModel.restoreOrder(args, { clientId, userId })
				if(restoredOrders.length) {
					return {
						status: 200,
						message: "Buyurtmalar qayta tiklandi!",
						data: restoredOrders
					}
				} else throw new BadRequestError("Bunday buyurtmalar mavjud emas!")
			} catch(error) { 
				throw error
			 }
		},
	},

	Query: {
		orders: async (_, args, user) => {
			try {
				const orders = await orderModel.orders(args, user)
				return orders
			} catch(error) {
				throw error
			}
		},
	},
	
	Order: {
		paid: 	               global => global.is_paid,
		count: 	               global => global.full_count,
		orderId:        	   global => global.order_id,
		special:        	   global => global.order_special,
		summary:        	   global => global.order_summary,
		price:        	       global => global.order_price,
		bringTime:      	   global => global.order_bring_time,
		broughtTime:    	   global => global.order_brougth_time,
		deliveryTime:   	   global => global.order_delivery_time,
		deliveredTime:  	   global => global.order_delivery_time,
		orderCreatedAt: 	   global => global.order_created_at,
		orderDeletedAt: 	   global => global.order_deleted_at,
		bringTimeRemaining:    global => global.bring_time_remaining && global.bring_time_remaining | 0,
		deliveryTimeRemaining: global => global.delivery_time_remaining && global.delivery_time_remaining | 0,
		client:         	   global => orderModel.client({ clientId: global.client_id }),
		branch:         	   global => orderModel.branch({ branchId: global.branch_id }),
		address:        	   global => orderModel.address({ addressId: global.address_id }),
		statusProcess:  	   global => orderModel.orderStatuses({ orderId: global.order_id }),
		products:  	           global => orderModel.products({ orderId: global.order_id }),
		transport:  	       global => orderModel.transport({ orderId: global.order_id }),
		transportsList:        global => orderModel.orderBindings({ orderId: global.order_id }),
		status:          async global => {
			const statuses = await orderModel.orderStatuses({ orderId: global.order_id })
			return statuses[statuses.length - 1]
		},
	},

	TransportDetail: {
		transport: global => orderModel.transport({ orderId: global.order_id, productId: global.product_id }),
		driver:    global => orderModel.staff({ staffId: global.staff_id }),
		direction: global => global.order_binding_type,
		finished:  global => global.finished,
	}
}
