import prisma from '../config/database.js'
import { hashPassword, comparePassword } from '../utils/hash.js'
import { signToken } from '../utils/jwt.js'

export const register = async (name, email, password, phoneNumber) => {
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
        return {
            "error": true,
            "message": "User already exists"
        }
    }

    const hashed = await hashPassword(password)

    const user = await prisma.user.create({
        data: { name, email, password: hashed, phoneNumber }
    })

    return {
        "error": false,
        token: signToken({ userId: user.id }),
        user: { id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber }
    }
}

export const login = async (email, password) => {
    try {
        const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, password: true } })

        if (!user) {
            return {
                error: true,
                message: 'Invalid credentials'
            }
        }

        const valid = await comparePassword(password, user.password)

        if (!valid) {
            return {
                error: true,
                message: 'Invalid credentials'
            }
        }

        // DELETE PASSWORD
        delete user.password

        return {
            error: false,
            token: signToken({ userId: user.id }),
            user: { id: user.id, name: user.name, email: user.email }
        }
    } catch (error) {
        console.log(error)
    }


}
