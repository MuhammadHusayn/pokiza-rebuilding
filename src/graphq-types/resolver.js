import { GraphQLScalarType, Kind } from 'graphql'

function checkDateType (value) {
	const dateRegEx = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/
	const timeRegEx = /^(?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d)$/
	const [ date, time ] = value.split(' ')
	const testForDate = dateRegEx.test(date)
	const testForTime = timeRegEx.test(time)
	if(!testForDate) throw new Error('Invaild date for type Date')
	if(!testForTime) throw new Error('Invaild time for type Date')
	return value
}

const dateScalar = new GraphQLScalarType({
	name: 'Date',
	description: 'Date custom scalar type',
	serialize: checkDateType,
	parseValue: checkDateType,
	parseLiteral(ast) {
		if (ast.kind === Kind.STRING) {
	      	return checkDateType(ast.value)
  		} else throw new Error('Date type must be a string like "dd-mm-yy hh:mm:ss"')
	},
})

export default {
	Date: dateScalar,
	BigTypes: {
		__resolveType (obj, context, info) {
			if(obj.branch_id && obj.branch_name && obj.branch_created_at) {
				return 'Branch'
			}
		}
	}
}