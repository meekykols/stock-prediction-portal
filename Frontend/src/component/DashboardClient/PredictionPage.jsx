import React, { useState } from 'react';
import api from '../../../API/API';
import { TrendingUp, Loader2, AlertCircle, BarChart3, Activity } from 'lucide-react';

const PredictionPage = () => {
    const [ticker, setTicker] = useState('')
    const [error, setError] = useState()
    const [loading, setLoading] = useState(false)
    const [plot, setPlot] = useState()
    const [ma100, setMA100] = useState()
    const [ma200, setMA200] = useState()
    const [prediction, setPrediction] = useState()
    const [mse, setMSE] = useState()
    const [rmse, setRMSE] = useState()
    const [r2, setR2] = useState()



    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true)
        try {
            const response = await api.post('/predict/', {
                ticker: ticker
            });
            console.log(response.data);
            const backendRoot = import.meta.env.VITE_REACT_APP_BACKEND_HOST
            const plotUrl = `${backendRoot}${response.data.plot_img}`
            const ma100Url = `${backendRoot}${response.data.plot_100_dma}`
            const ma200Url = `${backendRoot}${response.data.plot_200_dma}`
            const predictionUrl = `${backendRoot}${response.data.plot_prediction}`
            setPlot(plotUrl)
            setMA100(ma100Url)
            setMA200(ma200Url)
            setPrediction(predictionUrl)
            setMSE(response.data.mse)
            setRMSE(response.data.rmse)
            setR2(response.data.r2)
            // Set plots
            if (response.data.error) {
                setError(response.data.error)
            }
        } catch (error) {
            console.error('There was an error making the API request', error)
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                        Stock Price Predictor
                    </h1>
                    <p className="text-slate-400">Enter a stock ticker to see AI-powered predictions</p>
                </div>

                {/* Form Card */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 p-8">
                        <div className="space-y-6">
                            {/* Input Field */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-300">
                                    Stock Ticker Symbol
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="w-full px-4 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-lg"
                                        placeholder="e.g., AAPL, GOOGL, TSLA"
                                        value={ticker}
                                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                        required
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <BarChart3 className="w-5 h-5 text-slate-500" />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <span className="text-sm text-red-400">{error}</span>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={loading || !ticker}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Analyzing data...</span>
                                    </>
                                ) : (
                                    <>
                                        <Activity className="w-5 h-5" />
                                        <span>See Prediction</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Prediction Results */}
                {prediction && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Main Price Chart */}
                            {plot && (
                                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-400" />
                                        Stock Price Chart
                                    </h3>
                                    <div className="rounded-xl overflow-hidden bg-slate-800/50">
                                        <img src={plot} alt="Stock Price Chart" className="w-full h-auto" />
                                    </div>
                                </div>
                            )}

                            {/* 100-Day MA */}
                            {ma100 && (
                                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-green-400" />
                                        100-Day Moving Average
                                    </h3>
                                    <div className="rounded-xl overflow-hidden bg-slate-800/50">
                                        <img src={ma100} alt="100-Day Moving Average" className="w-full h-auto" />
                                    </div>
                                </div>
                            )}

                            {/* 200-Day MA */}
                            {ma200 && (
                                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-purple-400" />
                                        200-Day Moving Average
                                    </h3>
                                    <div className="rounded-xl overflow-hidden bg-slate-800/50">
                                        <img src={ma200} alt="200-Day Moving Average" className="w-full h-auto" />
                                    </div>
                                </div>
                            )}

                            {/* Prediction Chart */}
                            {prediction && (
                                <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-cyan-400" />
                                        Price Prediction
                                    </h3>
                                    <div className="rounded-xl overflow-hidden bg-slate-800/50">
                                        <img src={prediction} alt="Price Prediction" className="w-full h-auto" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Model Evaluation Card */}
                        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 p-8">
                            <h3 className="text-2xl font-bold text-slate-200 mb-6 flex items-center gap-2">
                                <Activity className="w-6 h-6 text-blue-400" />
                                Model Evaluation
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* MSE Metric */}
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all duration-300">
                                    <div className="text-sm text-slate-400 mb-2 font-medium">Mean Squared Error</div>
                                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                                        {mse}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">Lower is better</div>
                                </div>

                                {/* RMSE Metric */}
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-green-500/50 transition-all duration-300">
                                    <div className="text-sm text-slate-400 mb-2 font-medium">Root Mean Squared Error</div>
                                    <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                        {rmse}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">Prediction accuracy</div>
                                </div>

                                {/* R² Metric */}
                                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-purple-500/50 transition-all duration-300">
                                    <div className="text-sm text-slate-400 mb-2 font-medium">R-Squared Score</div>
                                    <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                        {r2}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">Model fit quality</div>
                                </div>
                            </div>

                            {/* Info Banner */}
                            <div className="mt-6 p-4 bg-blue-950/30 border border-blue-800/50 rounded-xl">
                                <p className="text-sm text-blue-300">
                                    <strong>Note:</strong> These metrics indicate the model's performance.
                                    An R² closer to 1.0 indicates better predictive accuracy.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fadeIn {
            animation: fadeIn 0.6s ease-out;
          }
        `}</style> */}
        </div>

    );
};

export default PredictionPage;