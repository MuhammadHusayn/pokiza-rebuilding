import monitoringModel from './model.js'
import { mError } from '#helpers/error'

const sections = {
	clients: ['branch', 'status', 'firstName', 'lastName', 'mainContact', 'secondContact', 'address', 'birthDate', 'gender', 'summary'],
	staffs: ['branch', 'file', 'firstName', 'lastName', 'mainContact', 'secondContact', 'address', 'birthDate', 'gender', 'summary'],
	orders: ['status', 'address', 'branch', 'summary', 'bringTime', 'plan', 'transport'],
	products: ['status', 'summary', 'service', 'file', 'transport', 'size'],
	transports: ['file', 'branch', 'name', 'color', 'status', 'number', 'summary'],
	settings: ['deliveryTime'],
	services: ['name', 'price', 'branch', 'unit', 'unitKeys'],
}

export default {
	Query: {
		monitoring: async (_, args) => {
			try {
				const { page, limit } = args.pagination

				let monitoring = await monitoringModel.monitoring(args)

				monitoring = monitoring.map(el => {
					if(el.section_name == 'products' && el.section_field == 'status') {
						el.old_value = 'value: ' + process.PRODUCT_STATUSES[el.old_value]?.name
						el.new_value = 'value: ' + process.PRODUCT_STATUSES[el.new_value]?.name
						return el
					}

					if(el.section_name == 'orders' && el.section_field == 'status') {
						el.old_value = 'value: ' + process.ORDER_STATUSES[el.old_value]?.name
						el.new_value = 'value: ' + process.ORDER_STATUSES[el.new_value]?.name
						return el
					}

					if((['clients', 'staffs']).includes(el.section_name) && el.section_field == 'birthDate') {
						let [, oldDate] = el.old_value.split('value: ')
						let [, newDate] = el.new_value.split('value: ')
						oldDate = new Date(oldDate)
						newDate = new Date(newDate)
						el.old_value = oldDate.toISOString().split('T')[0]
						el.new_value = newDate.toISOString().split('T')[0]
						return el
					}

					if((['clients', 'staffs']).includes(el.section_name) && el.section_field == 'gender') {
						let [, oldBirthDate] = el.old_value.split('value: ')
						let [, newBirthDate] = el.new_value.split('value: ')
						el.old_value = oldBirthDate == 1 ? 'value: male' : oldBirthDate == 2 ? 'value: female' : el.old_value
						el.new_value = newBirthDate == 1 ? 'value: male' : newBirthDate == 2 ? 'value: female' : el.new_value
						return el
					}

					return el
				}).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

				monitoring = monitoring.slice((page - 1) * limit, page * limit)

				return monitoring
			} catch(error) {
				throw error
			}
		},

		monitoringSections: async (_, args) => {
			try {
				return Object.keys(sections).map(key => {
					return {
						sectionName: key,
						sectionFields: sections[key]
					}
				})
			} catch(error) {
				throw error
			}
		},
	},

	Monitoring: {
		oldValue:      global => global.old_value,
		newValue:      global => global.new_value,
		operationType: global => global.operation_type,
		sectionName:   global => global.section_name,
		sectionId:     global => global.section_id,
		sectionField:  global => global.section_field,
		createdAt:     global => global.created_at,
		branch:        global => monitoringModel.branch({ branchId: global.branch_id }),
		user:    async global =>  {
			const { client, staff } = await monitoringModel.user({ userId: global.notification_to })
			return client || staff
		},
	}
}