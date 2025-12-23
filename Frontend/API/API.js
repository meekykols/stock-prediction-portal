import axios from "axios";
const local = import.meta.env.VITE_REACT_APP_BACKEND_HOST;
//const production = ''
const api = axios.create({
    baseURL : `${local}/api/v1`,
    headers:{"Content-Type":"application/json"}
})
// separate instance for refresh
const refreshApi = axios.create({
    baseURL: `${local}/api/v1`,
    headers: { "Content-Type": "application/json" },
  });
// the request interceptors
api.interceptors.request.use(
    function(config){
        const accessToken=localStorage.getItem("accessToken")
        if(accessToken){
            config.headers['Authorization']=`Bearer ${accessToken}` 
        }
        return config;
    }, function (error) {
        return Promise.reject(error);
      },
    //   { synchronous: true, runWhen: () => console.log("request==> true")}
)

api.interceptors.response.use(
    (response) => response,
  
    async (error) => {
      const originalRequest = error.config;
  
      //  stop if no response (network error)
      if (!error.response) {
        return Promise.reject(error);
      }
  
      //  prevent infinite loop
      if (
        error.response.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.url.includes("/token/refresh/")
      ) {
        originalRequest._retry = true;
  
        const refreshToken = localStorage.getItem("refreshToken");
  
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }
  
        try {
          const response = await refreshApi.post("/token/refresh/", {
            refresh: refreshToken,
          });
  
          const newAccessToken = response.data.access;
  
          localStorage.setItem("accessToken", newAccessToken);
  
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
  
          return api(originalRequest);
        } catch (refreshError) {
          logout();
          return Promise.reject(refreshError);
        }
      }
  
      return Promise.reject(error);
    }
  );

  // =======================
// LOGOUT HANDLER
// =======================
function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  }

export default api