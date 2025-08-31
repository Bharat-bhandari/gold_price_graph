import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  Factory,
  Calendar,
  Filter,
  Coins,
  RefreshCw,
} from "lucide-react";

const App = () => {
  const [goldData, setGoldData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState("1y");
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Symbol selection (INR ETF vs COMEX futures USD)
  const [symbol, setSymbol] = useState("GOLDBEES.NS"); // INR default
  const symbols = [
    {
      value: "GOLDBEES.NS",
      label: "Gold ETF (NSE, INR, per 0.01 gram)",
      currency: "INR",
    },
    { value: "GC=F", label: "COMEX Gold Futures (USD/oz)", currency: "USD" },
  ];

  const API_BASE_URL = "https://backend.jeevandharadigital.in";

  // Primary theme (indigo)
  const PRIMARY_HEX = "#4f46e5"; // indigo-600
  const PRIMARY_HEX_DARK = "#4338ca"; // indigo-700

  const periodOptions = [
    { value: "1d", label: "1 Day" },
    { value: "5d", label: "5 Days" },
    { value: "1mo", label: "1 Month" },
    { value: "3mo", label: "3 Months" },
    { value: "6mo", label: "6 Months" },
    { value: "1y", label: "1 Year" },
    { value: "2y", label: "2 Years" },
    { value: "5y", label: "5 Years" },
  ];

  const fetchGold = async () => {
    setLoading(true);
    setError("");

    try {
      let url = `${API_BASE_URL}/api/gold/stock-data?symbol=${encodeURIComponent(
        symbol
      )}`;

      if (useCustomRange && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      } else {
        url += `&period=${selectedPeriod}&interval=1d`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === "error") throw new Error(json.message);

      const processed = process(json.data);
      setGoldData(processed.chartData);
      setInfo(processed.info);
      setLastUpdated(new Date());
    } catch (e) {
      setError(`Failed to fetch gold data: ${e.message}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const process = (apiData) => {
    if (!apiData || apiData.length === 0) {
      return { chartData: [], info: null };
    }

    // Normalize keys from backend (supports lower-case & TitleCase)
    const chartData = apiData
      .map((row) => {
        const dateStr = row.timestamp || row.Date || row.date || row.index;

        const open = row.open ?? row.Open ?? 0;
        const high = row.high ?? row.High ?? 0;
        const low = row.low ?? row.Low ?? 0;
        const close = row.close ?? row.Close ?? 0;
        const volume = row.volume ?? row.Volume ?? 0;
        const dividends = row.dividends ?? row.Dividends ?? 0;
        const stockSplits = row.stockSplits ?? row["Stock Splits"] ?? 0;

        const dt = new Date(dateStr);
        return {
          date: dateStr,
          timestamp: dt.getTime(),
          open: Number(open),
          high: Number(high),
          low: Number(low),
          close: Number(close),
          volume: Number(volume),
          dividends: Number(dividends),
          stockSplits: Number(stockSplits),
          displayDate: dt.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year:
              selectedPeriod === "1d" || selectedPeriod === "5d"
                ? "numeric"
                : "2-digit",
          }),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const latest = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2] || latest;

    const price = latest?.close ?? 0;
    const prevPrice = prev?.close ?? price;
    const change = price - prevPrice;
    const changePct = prevPrice ? (change / prevPrice) * 100 : 0;

    const prices = chartData.map((d) => d.close);
    const highs = Math.max(...prices);
    const lows = Math.min(...prices);
    const samePrice = highs === lows;

    const volumes = chartData.map((d) => d.volume || 0);
    const avgVolume =
      volumes.length > 0
        ? volumes.reduce((a, b) => a + b, 0) / volumes.length
        : 0;

    const currency = symbols.find((s) => s.value === symbol)?.currency || "INR";

    return {
      chartData,
      info: {
        symbol,
        instrument: symbols.find((s) => s.value === symbol)?.label || "Gold",
        currency,
        price,
        change,
        changePercent: changePct,
        periodHigh: highs,
        periodLow: lows,
        volume: latest?.volume || 0,
        avgVolume,
        totalDividends: chartData.reduce(
          (sum, r) => sum + (r.dividends || 0),
          0
        ),
        samePriceDomain: samePrice,
      },
    };
  };

  useEffect(() => {
    fetchGold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, selectedPeriod, useCustomRange]);

  const handleCustomRangeFetch = () => {
    if (startDate && endDate) fetchGold();
  };

  const getTrendIcon = (delta) => {
    if (delta > 0) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (delta < 0) return <TrendingDown className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getTrendColor = (delta) => {
    if (delta > 0) return "text-green-600 bg-green-50 border-green-200";
    if (delta < 0) return "text-red-600 bg-red-50 border-red-200";
    return "text-gray-600 bg-gray-50 border-gray-200";
  };

  const toCurrency = (value) => {
    const currency = symbols.find((s) => s.value === symbol)?.currency || "INR";
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${Number(value || 0).toFixed(2)}`;
    }
  };

  const formatVolume = (value) => {
    if (!value) return "0";
    if (value >= 1e7) return `${(value / 1e7).toFixed(1)} Cr`;
    if (value >= 1e5) return `${(value / 1e5).toFixed(1)} L`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
    return `${value}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Coins className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Gold Price Dashboard
        </h2>
        <button
          onClick={fetchGold}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border bg-white hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>

        <div className="space-y-4">
          {/* Symbol selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Instrument:
            </span>
            <div className="flex flex-wrap gap-2">
              {symbols.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSymbol(s.value)}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    symbol === s.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period Selection */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!useCustomRange}
                onChange={() => setUseCustomRange(false)}
                className="accent-indigo-600"
              />
              <span className="text-sm font-medium">Quick Periods:</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedPeriod(option.value);
                    setUseCustomRange(false);
                  }}
                  disabled={useCustomRange}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    selectedPeriod === option.value && !useCustomRange
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  } ${useCustomRange ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={useCustomRange}
                onChange={() => setUseCustomRange(true)}
                className="accent-indigo-600"
              />
              <span className="text-sm font-medium">Custom Range:</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={!useCustomRange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!useCustomRange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleCustomRangeFetch}
                disabled={!useCustomRange || !startDate || !endDate || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-red-700">
            <div className="font-medium">Error loading data</div>
            <div className="text-sm mt-1">{error}</div>
            <div className="text-xs mt-2 text-red-600">
              Make sure your Flask backend is running on {API_BASE_URL}
            </div>
          </div>
        </div>
      )}

      {/* KPI Card */}
      {info && (
        <div
          className={`border rounded-lg p-4 bg-white shadow-sm flex flex-wrap items-center gap-4 ${getTrendColor(
            info.change
          )}`}
        >
          <div className="flex items-center gap-2">
            {getTrendIcon(info.change)}
            <div>
              <div className="text-sm text-gray-500">Instrument</div>
              <div className="font-semibold">{info.instrument}</div>
            </div>
          </div>
          <div className="ml-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-gray-500">Price</div>
              <div className="font-semibold">{toCurrency(info.price)}</div>
            </div>
            <div>
              <div className="text-gray-500">Change</div>
              <div className="font-semibold">
                {toCurrency(info.change)} ({info.changePercent.toFixed(2)}%)
              </div>
            </div>
            <div>
              <div className="text-gray-500">High / Low</div>
              <div className="font-semibold">
                {toCurrency(info.periodHigh)} / {toCurrency(info.periodLow)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Avg Volume</div>
              <div className="font-semibold">
                {formatVolume(info.avgVolume)}
              </div>
            </div>
          </div>
          {lastUpdated && (
            <div className="w-full text-xs text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleString("en-IN")}
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="space-y-6">
        {/* Price */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Gold Price ({symbols.find((s) => s.value === symbol)?.currency})
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="ml-2 text-gray-600">Loading gold data...</span>
            </div>
          ) : goldData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={goldData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) =>
                      toCurrency(v).replace(/[^\d.,-]/g, "")
                    }
                    domain={
                      info?.samePriceDomain
                        ? [(dataMin) => dataMin - 1, (dataMax) => dataMax + 1]
                        : ["dataMin - 10", "dataMax + 10"]
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                    formatter={(value) => [toCurrency(value), "Close Price"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={PRIMARY_HEX}
                    strokeWidth={2.5}
                    dot={{ fill: PRIMARY_HEX, strokeWidth: 2, r: 3 }}
                    strokeLinecap="round"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : !loading && !error ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <Factory className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <div>No data available</div>
                <div className="text-sm">Try different filters or refresh</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Volume */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trading Volume
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-gray-600">Loading volume data...</span>
            </div>
          ) : goldData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={goldData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="#666"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => formatVolume(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    }}
                    formatter={(value) => [formatVolume(value), "Volume"]}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Bar
                    dataKey="volume"
                    fill={PRIMARY_HEX}
                    opacity={0.8}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : !loading && !error ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">No volume data available</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default App;
