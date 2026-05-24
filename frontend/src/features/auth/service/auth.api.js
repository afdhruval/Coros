import axios from "axios"
import { API_URL } from "../../../config/config"

const api = axios.create({
    baseURL: `${API_URL}/api/auth`,
    withCredentials: true
})

export async function register({ email, username, password }) {
    const response = await api.post("/register", {
        email,
        username,
        password
    })

    return response.data
}

export async function login({ email, password }) {
    const response = await api.post("/login", {
        email,
        password
    })

    return response.data
}

export async function getMe() {
    const response = await api.get("/getme")
    return response.data
}

export async function verifyEmail(token) {
    const response = await api.get(`/verify?token=${token}`)
    return response.data
}

export async function logoutApi() {
    const response = await api.get("/logout")
    return response.data
}