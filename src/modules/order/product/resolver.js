import productModel from './model.js'
import upload from '#helpers/upload'
import { mError } from '#helpers/error'

export default {
	Mutation: {
		addProduct: async (_, args, { staffId }) => {
			try {
				await upload(args)
				const newProduct = await productModel.addProduct(args, { staffId })
				if(newProduct) {
					return {
						status: 200,
						message: "Buyum qabul qilindi!",
						data: newProduct
					}
				} else throw new Error("buyumni qabul qilishda muammolik yuz berdi!")  
			} catch(error) { return mError(error) }
		},

		changeProduct: async (_, args) => {
			try {
				await upload(args)
				const updatedProduct = await productModel.changeProduct(args)
				if(updatedProduct) {
					return {
						status: 200,
						message: "Buyum ma'lumotlari yangilandi!",
						data: updatedProduct
					}
				} else throw new Error("Buyum ma'lumotlarini yangilashda muammolik yuz berdi!")  
			} catch(error) { return mError(error) }
		},
	},
	Query: {
		products: async (_, args, { clientId }) => {
			try {
				const products = await productModel.products({ isDeleted: false, ...args }, { clientId })
				return products
			} catch(error) {
				throw error
			}
		},
	},

	Product: {
		productId:            global => global.product_id,
		count:                global => global.full_count,
		productSize:          global => global.product_size,
		productPrice:         global => global.product_price,
		productSummary:       global => global.product_summary,
		productSpecial:       global => global.order_special,
		productSizeDetails:   global => global.product_size_details,
		productImg:           global => global.product_img && '/data/uploads/' + global.product_img,
		productStatusProcess: global => productModel.productStatuses({ productId: global.product_id }),
		service:              global => productModel.service({ serviceId: global.service_id }),
		order:                global => productModel.order({ orderId: global.order_id }),
		productStatus:  async global => {
			const statuses = await productModel.productStatuses({ productId: global.product_id })
			return statuses[statuses.length - 1]
		},
	}
}