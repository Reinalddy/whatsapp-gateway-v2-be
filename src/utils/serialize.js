/**
 * Convert BigInt values in object to strings for JSON serialization
 * @param {object} obj - Object that may contain BigInt values
 * @returns {object} - Object with BigInt converted to strings
 */
export const serializeUser = (user) => {
    if (!user) return null

    return {
        ...user,
        phoneNumber: user.phoneNumber?.toString() || null
    }
}

/**
 * Generic serializer for objects with BigInt
 */
export const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ))
}
