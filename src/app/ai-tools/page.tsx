"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DotGrid from "@/components/DotGrid";
import { Brain, TrendingUp, Shield, Loader2, Wallet, AlertCircle } from "lucide-react";
// Helper functions to parse AI responses
const parseForecastResponse = (response: string): {
  prediction: string;
  confidence: number;
  timeframe: string;
  factors: string[];
} => {
  const lines = response.split('\n').filter(line => line.trim());
  
  let prediction = "Rate forecast analysis completed";
  let confidence = 75;
  let timeframe = "30 days";
  let factors: string[] = [];
  
  // Try to extract structured information from the response
  lines.forEach(line => {
    if (line.toLowerCase().includes('prediction') || line.toLowerCase().includes('forecast')) {
      prediction = line.replace(/.*prediction[:\s]*/i, '').replace(/.*forecast[:\s]*/i, '');
    }
    if (line.toLowerCase().includes('confidence')) {
      const match = line.match(/(\d+)%/);
      if (match) confidence = parseInt(match[1]);
    }
    if (line.toLowerCase().includes('timeframe') || line.toLowerCase().includes('period')) {
      const match = line.match(/(\d+)\s*(days?|weeks?|months?)/i);
      if (match) timeframe = `${match[1]} ${match[2]}`;
    }
    if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
      factors.push(line.replace(/^[•\-\d\.\s]+/, '').trim());
    }
  });
  
  return { prediction, confidence, timeframe, factors };
};

const parseHedgingResponse = (response: string): {
  strategy: string;
  riskReduction: number;
  recommendations: string[];
  expectedReturn: string;
} => {
  const lines = response.split('\n').filter(line => line.trim());
  
  let strategy = "Dynamic hedging strategy";
  let riskReduction = 60;
  let expectedReturn = "8-12% annualized";
  let recommendations: string[] = [];
  
  // Try to extract structured information from the response
  lines.forEach(line => {
    if (line.toLowerCase().includes('strategy') || line.toLowerCase().includes('approach')) {
      strategy = line.replace(/.*strategy[:\s]*/i, '').replace(/.*approach[:\s]*/i, '');
    }
    if (line.toLowerCase().includes('risk') && line.toLowerCase().includes('reduction')) {
      const match = line.match(/(\d+)%/);
      if (match) riskReduction = parseInt(match[1]);
    }
    if (line.toLowerCase().includes('return') || line.toLowerCase().includes('yield')) {
      const match = line.match(/(\d+[-–]\d+%|\d+%)/);
      if (match) expectedReturn = match[0];
    }
    if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
      recommendations.push(line.replace(/^[•\-\d\.\s]+/, '').trim());
    }
  });
  
  return { strategy, riskReduction, recommendations, expectedReturn };
};


interface ForecastResult {
  prediction: string;
  confidence: number;
  timeframe: string;
  factors: string[];
}

interface HedgingResult {
  strategy: string;
  riskReduction: number;
  recommendations: string[];
  expectedReturn: string;
}

export default function AITools() {
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [hedgingResult, setHedgingResult] = useState<HedgingResult | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [isLoadingHedging, setIsLoadingHedging] = useState(false);
  const [userInvestments, setUserInvestments] = useState("");
  const [brokerBalance, setBrokerBalance] = useState<string | null>(null);
  const [brokerAvailable, setBrokerAvailable] = useState<string | null>(null);
  const [brokerError, setBrokerError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-instruct");

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/ai/balance');
      const data = await response.json();

      setIsInitialized(true);

      if (data.error && data.demo) {
        setBrokerError("No 0G private key found. Using demo mode with simulated responses.");
        setBrokerBalance("1.0");
      } else {
        // Use the total balance field from the response
        setBrokerBalance(data.balance || "0.0");
        setBrokerAvailable(data.available || "0.0");
      }
    } catch (error) {
      setBrokerError("0G Network integration failed. Using demo mode with simulated responses.");
      setIsInitialized(true);
      setBrokerBalance("1.0");
    }
  };

  const handleRatesForecast = async () => {
    if (!isInitialized) {
      setBrokerError("System not initialized. Please try again.");
      return;
    }

    setIsLoadingForecast(true);
    setBrokerError(null);
    
    try {
      const prompt = "Analyze current market conditions and predict short-term floating rates for the next 30 days. Consider factors like Federal Reserve policy, inflation trends, market volatility, and economic indicators. Provide a detailed forecast with confidence levels.";
      
          const response = await fetch('/api/ai/forecast', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, model: selectedModel }),
          });
      
      const data = await response.json();
      
      if (data.error && data.demo) {
        console.log("Using demo forecast - 0G private key not configured");
      }
      
      const parsedResult = parseForecastResponse(data.response);
      setForecastResult(parsedResult);
    } catch (error) {
      console.error("Forecast error:", error);
      
      // Fallback to demo data if 0G fails
      setForecastResult({
        prediction: "Short-term rates are expected to increase by 0.25-0.5% over the next 30 days based on current market analysis",
        confidence: 87,
        timeframe: "30 days",
        factors: [
          "Federal Reserve policy signals",
          "Inflation data trends", 
          "Market volatility indicators",
          "Economic growth projections"
        ]
      });
      
      setBrokerError("Using demo data - 0G Network integration in progress");
    } finally {
      setIsLoadingForecast(false);
    }
  };

  const handleHedgingStrategy = async () => {
    if (!userInvestments.trim()) {
      alert("Please describe your current investments");
      return;
    }

    if (!isInitialized) {
      setBrokerError("System not initialized. Please try again.");
      return;
    }

    setIsLoadingHedging(true);
    setBrokerError(null);
    
    try {
          const response = await fetch('/api/ai/hedging', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userInvestments, model: selectedModel }),
          });
      
      const data = await response.json();
      
      if (data.error && data.demo) {
        console.log("Using demo hedging strategy - 0G private key not configured");
      }
      
      const parsedResult = parseHedgingResponse(data.response);
      setHedgingResult(parsedResult);
    } catch (error) {
      console.error("Hedging strategy error:", error);
      
      // Fallback to demo data if 0G fails
      setHedgingResult({
        strategy: "Dynamic Delta Hedging with Options",
        riskReduction: 75,
        recommendations: [
          "Implement 30% portfolio hedge using ETH put options",
          "Consider funding rate swaps for 60-day exposure",
          "Diversify with 20% stablecoin allocation",
          "Set stop-loss at 15% portfolio value"
        ],
        expectedReturn: "8-12% annualized with 40% risk reduction"
      });
      
      setBrokerError("Using demo data - 0G Network integration in progress");
    } finally {
      setIsLoadingHedging(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Dot Grid Background */}
      <div className="fixed inset-0 w-full h-full">
        <DotGrid
          dotSize={4}
          gap={15}
          baseColor="#303030"
          activeColor="#BDEE63"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 pointer-events-none p-4">
        <div className="pointer-events-auto space-y-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-[hsl(var(--primary))] tracking-tight font-outfit">
              AI Tools
            </h1>
            <p className="text-[hsl(var(--foreground))] text-lg opacity-80">
              Powered by 0G AI models for intelligent market analysis and hedging strategies
            </p>
            
                {/* Model Selection */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="model-select" className="text-[hsl(var(--foreground))] text-sm">
                      AI Model:
                    </Label>
                    <select
                      id="model-select"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="px-3 py-1 bg-transparent border border-[rgba(189,238,99,0.2)] rounded-lg text-[hsl(var(--foreground))] text-sm focus:outline-none focus:border-[rgba(189,238,99,0.4)]"
                    >
                      <option value="llama-3.3-70b-instruct">Llama 3.3 70B (Recommended)</option>
                      <option value="deepseek-r1-70b">DeepSeek R1 70B (Premium)</option>
                    </select>
                  </div>
                </div>

                {/* Broker Status */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-[rgba(189,238,99,0.1)] rounded-lg border border-[rgba(189,238,99,0.2)]">
                    <Wallet className="h-4 w-4 text-[hsl(var(--primary))]" />
                    <span className="text-sm text-[hsl(var(--foreground))]">
                      {isInitialized ?
                        (brokerError?.includes("demo") ? "Demo Mode" : "0G Network Connected") :
                        "Connecting..."
                      }
                    </span>
                  </div>
                  {brokerBalance && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-[rgba(189,238,99,0.1)] rounded-lg border border-[rgba(189,238,99,0.2)]">
                      <span className="text-sm text-[hsl(var(--foreground))]">
                        Balance: {parseFloat(brokerBalance).toFixed(4)} OG
                        {brokerAvailable && parseFloat(brokerAvailable) !== parseFloat(brokerBalance) && (
                          <span className="text-xs opacity-70 ml-1">
                            (Available: {parseFloat(brokerAvailable).toFixed(4)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
            
            {brokerError && (
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">{brokerError}</span>
              </div>
            )}
          </div>

          {/* AI Tools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI-Driven Rates Forecasting */}
            <Card className="bg-[rgba(189,238,99,0.05)] border-[rgba(189,238,99,0.14)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[hsl(var(--primary))]">
                  <TrendingUp className="h-5 w-5" />
                  AI-Driven Rates Forecasting
                </CardTitle>
                <CardDescription className="text-[hsl(var(--foreground))] opacity-70">
                  Predict short-term floating rates using advanced AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={handleRatesForecast}
                  disabled={isLoadingForecast}
                  className="w-full bg-[hsl(var(--primary))] text-black hover:bg-[hsl(var(--primary))]/90 transition-all duration-200"
                >
                  {isLoadingForecast ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Market Data...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Rate Forecast
                    </>
                  )}
                </Button>

                {forecastResult && (
                  <div className="space-y-3 p-4 bg-[rgba(189,238,99,0.1)] rounded-lg border border-[rgba(189,238,99,0.2)]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[hsl(var(--primary))]">Prediction:</span>
                      <span className="text-sm bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        {forecastResult.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-[hsl(var(--foreground))] text-sm">{forecastResult.prediction}</p>
                    <div>
                      <span className="font-semibold text-[hsl(var(--primary))] text-sm">Timeframe:</span>
                      <span className="text-[hsl(var(--foreground))] text-sm ml-2">{forecastResult.timeframe}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[hsl(var(--primary))] text-sm">Key Factors:</span>
                      <ul className="text-[hsl(var(--foreground))] text-sm mt-1 space-y-1">
                        {forecastResult.factors.map((factor, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-[hsl(var(--primary))] mr-2">•</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI-Optimized Hedging Strategies */}
            <Card className="bg-[rgba(189,238,99,0.05)] border-[rgba(189,238,99,0.14)] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[hsl(var(--primary))]">
                  <Shield className="h-5 w-5" />
                  AI-Optimized Hedging Strategies
                </CardTitle>
                <CardDescription className="text-[hsl(var(--foreground))] opacity-70">
                  Get personalized hedging recommendations based on your portfolio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="investments" className="text-[hsl(var(--foreground))]">
                    Describe your current investments:
                  </Label>
                  <Input
                    id="investments"
                    placeholder="e.g., 50% ETH, 30% BTC, 20% stablecoins..."
                    value={userInvestments}
                    onChange={(e) => setUserInvestments(e.target.value)}
                    className="bg-transparent border-[rgba(189,238,99,0.2)] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--foreground))]/50"
                  />
                </div>
                
                <Button 
                  onClick={handleHedgingStrategy}
                  disabled={isLoadingHedging || !userInvestments.trim()}
                  className="w-full bg-[hsl(var(--primary))] text-black hover:bg-[hsl(var(--primary))]/90 transition-all duration-200"
                >
                  {isLoadingHedging ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing Portfolio...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Hedging Strategy
                    </>
                  )}
                </Button>

                {hedgingResult && (
                  <div className="space-y-3 p-4 bg-[rgba(189,238,99,0.1)] rounded-lg border border-[rgba(189,238,99,0.2)]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[hsl(var(--primary))]">Strategy:</span>
                      <span className="text-sm bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        {hedgingResult.riskReduction}% risk reduction
                      </span>
                    </div>
                    <p className="text-[hsl(var(--foreground))] text-sm font-medium">{hedgingResult.strategy}</p>
                    <div>
                      <span className="font-semibold text-[hsl(var(--primary))] text-sm">Expected Return:</span>
                      <span className="text-[hsl(var(--foreground))] text-sm ml-2">{hedgingResult.expectedReturn}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[hsl(var(--primary))] text-sm">Recommendations:</span>
                      <ul className="text-[hsl(var(--foreground))] text-sm mt-1 space-y-1">
                        {hedgingResult.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-[hsl(var(--primary))] mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


        </div>
      </div>
    </div>
  );
}
