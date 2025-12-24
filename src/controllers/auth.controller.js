import * as AuthService from '../services/auth.service.js'

export const register = async (req, res) => {
  try {

    const { name, email, password, phoneNumber } = req.body

    if(!name || !email || !password || !phoneNumber) {
        return res.status(400).json({
            "code": 400,
            "message": "Missing required fields"
        })
    }

    const result = await AuthService.register(name, email, password, phoneNumber);

    if(result.error) {
        return res.status(400).json({
            "code": 400,
            "message": result.message
        })
    }

    res.json({
        "code": 200,
        "message": "User registered successfully",
        "data": {
          token : result.token,
          user: result.user
        }
    })

  } catch (err) {
    console.log(err)
    res.status(500).json({
        "code": 500,
        "message":"Something went wrong",
        "error": err
    });
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await AuthService.login(email, password)

    if(result.error) {
        return res.status(400).json({
            "code": 400,
            "message": result.message
        })
    }

    res.json({
        "code": 200,
        "message": "User logged in successfully",
        "data": {
          token : result.token,
          user: result.user
        }
    })
  } catch (err) {
    res.status(401).json({ message: err.message })
  }
}
