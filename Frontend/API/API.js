import axios from "axios";
// const local = process.env.REACT_APP_BACKEND_HOST;
//const production = ''
const local ="http://localhost:8000"
const api = axios.create({
    baseURL : `${local}/api/v1`
})

export default api