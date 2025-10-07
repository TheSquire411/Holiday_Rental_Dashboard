import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, BrainCircuit, LayoutDashboard, Hotel, AlertTriangle } from 'lucide-react';

// --- Helper Functions & Constants ---

// Simple markdown-to-HTML parser for AI insights
const parseMarkdown = (text) => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
        .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>'); // List items
};

// Colors for charts - using a modern, professional palette
const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f97316', '#ec4899'];

// --- MOCK DATA ---
// This sample data is used if the API call fails, allowing the UI to still be viewed.
const MOCK_BOOKINGS = [
    { id: 1, guest: { name: 'John Doe' }, arrival: '2024-01-15', departure: '2024-01-20', totalAmount: 500, source: 'Airbnb', status: 'Booked' },
    { id: 2, guest: { name: 'Jane Smith' }, arrival: '2024-02-10', departure: '2024-02-15', totalAmount: 650, source: 'Booking.com', status: 'Booked' },
    { id: 3, guest: { name: 'Peter Jones' }, arrival: '2024-02-20', departure: '2024-02-25', totalAmount: 550, source: 'Direct', status: 'Booked' },
    { id: 4, guest: { name: 'Mary Williams' }, arrival: '2024-03-05', departure: '2024-03-10', totalAmount: 700, source: 'Airbnb', status: 'Booked' },
];


// --- Main App Component ---
export default function App() {
    // --- STATE MANAGEMENT ---
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'bookings'
    
    // AI Insights State
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [insights, setInsights] = useState('');
    const [insightsError, setInsightsError] = useState(null);

    // --- API & DATA FETCHING ---
    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setIsLoading(true);
        setError(null);
        
        // --- PRODUCTION-READY API CALL ---
        // This URL points to the serverless function. Vercel automatically knows
        // how to route this request to the /api/bookings.js file.
        const API_PROXY_URL = '/api/bookings';

        try {
            const response = await fetch(API_PROXY_URL);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API call failed with status ${response.status}`);
            }

            const data = await response.json();
            setBookings(data.items || []);

        } catch (err) {
            console.error("Error fetching bookings:", err);
            let detailedError = `Failed to fetch bookings from the server. This could mean the Lodgify API key is missing or incorrect in your Vercel project settings. The app is showing sample data. Error: ${err.message}`;
            setError(detailedError);
            // Fallback to mock data so the UI remains usable for demonstration.
            setBookings(MOCK_BOOKINGS);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- AI INSIGHTS GENERATION ---
    const generateInsights = async () => {
        if (!bookings.length) {
            setInsightsError("No booking data available to analyze.");
            return;
        }

        setIsGeneratingInsights(true);
        setInsights('');
        setInsightsError(null);

        const systemPrompt = `You are a world-class hospitality analyst and revenue management expert for vacation rentals. Your task is to analyze booking data and provide actionable insights in a clear, concise, and easy-to-understand format. Focus on identifying trends, strengths, weaknesses, and opportunities for improvement.`;

        const simplifiedData = bookings
            .filter(b => b.status === 'Booked')
            .map(b => ({
                arrival: b.arrival,
                nights: (new Date(b.departure) - new Date(b.arrival)) / (1000 * 60 * 60 * 24),
                totalAmount: b.totalAmount,
                source: b.source
            }));
            
        const userQuery = `Analyze the following vacation rental booking data and provide actionable advice. Format your response using markdown with bold headings and bullet points. Analyze revenue channels, seasonal trends, and booking value, then provide 3-5 concrete recommendations. Data: ${JSON.stringify(simplifiedData, null, 2)}`;

        const geminiApiKey = ""; // This is managed by the execution environment.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }),
            });

            if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) setInsights(text); else throw new Error("Received an empty response from the AI.");

        } catch (err) {
            console.error("Error generating insights:", err);
            setInsightsError(`Failed to generate insights. ${err.message}`);
        } finally {
            setIsGeneratingInsights(false);
        }
    };

    // --- DATA PROCESSING & MEMOIZATION ---
    const processedData = useMemo(() => {
        if (!bookings) return {}; // Guard against null/undefined bookings
        const confirmedBookings = bookings.filter(b => b.status === 'Booked');
        const totalRevenue = confirmedBookings.reduce((acc, b) => acc + b.totalAmount, 0);
        const totalNights = confirmedBookings.reduce((acc, b) => acc + ((new Date(b.departure) - new Date(b.arrival)) / (1000 * 3600 * 24)), 0);
        const totalBookings = confirmedBookings.length;
        const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
        const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0;
        const monthlyData = {};
        const channelData = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        confirmedBookings.forEach(booking => {
            const month = new Date(booking.arrival).getMonth();
            const monthName = monthNames[month];
            if (!monthlyData[month]) monthlyData[month] = { name: monthName, monthIndex: month, bookings: 0 };
            monthlyData[month].bookings += 1;
            const source = booking.source || 'Unknown';
            if (!channelData[source]) channelData[source] = { name: source, revenue: 0 };
            channelData[source].revenue += booking.totalAmount;
        });
        const bookingsByMonth = Object.values(monthlyData).sort((a, b) => a.monthIndex - b.monthIndex);
        const revenueByChannel = Object.values(channelData);
        return { totalRevenue, totalBookings, avgBookingValue, avgNightlyRate, bookingsByMonth, revenueByChannel };
    }, [bookings]);

    // Main App Layout
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="flex items-center justify-center h-16 border-b">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <span className="ml-2 text-xl font-bold text-gray-800">Lodgify AI</span>
                </div>
                <nav className="flex-grow p-4 space-y-2">
                    <a href="#" onClick={() => setActiveView('dashboard')} className={`flex items-center px-4 py-2 text-gray-700 rounded-lg transition-colors ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                        <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
                    </a>
                    <a href="#" onClick={() => setActiveView('bookings')} className={`flex items-center px-4 py-2 text-gray-700 rounded-lg transition-colors ${activeView === 'bookings' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
                        <Hotel className="w-5 h-5 mr-3" /> All Bookings
                    </a>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <svg className="w-12 h-12 mx-auto text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <p className="mt-2 text-gray-600">Loading your bookings...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="p-4 mb-4 text-sm text-yellow-800 bg-yellow-10 toning-800 border border-yellow-300 rounded-lg flex items-center" role="alert">
                                <AlertTriangle className="w-5 h-5 mr-3" />
                                <div><span className="font-medium">Warning:</span> {error}</div>
                            </div>
                        )}
                        {/* Dashboard View */}
                        {activeView === 'dashboard' && processedData.bookingsByMonth && (
                            <div className="space-y-6">
                                <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard title="Total Revenue" value={`$${(processedData.totalRevenue || 0).toFixed(2)}`} />
                                    <StatCard title="Total Bookings" value={processedData.totalBookings || 0} />
                                    <StatCard title="Avg. Booking Value" value={`$${(processedData.avgBookingValue || 0).toFixed(2)}`} />
                                    <StatCard title="Avg. Nightly Rate" value={`$${(processedData.avgNightlyRate || 0).toFixed(2)}`} />
                                </div>
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                                    <div className="lg:col-span-3 p-4 bg-white border rounded-xl shadow">
                                       <h3 className="font-semibold text-gray-700">Bookings per Month</h3>
                                       <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={processedData.bookingsByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip wrapperClassName="rounded-md border bg-white shadow-sm" />
                                                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="lg:col-span-2 p-4 bg-white border rounded-xl shadow">
                                        <h3 className="font-semibold text-gray-700">Revenue by Channel</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie data={processedData.revenueByChannel} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                                    {processedData.revenueByChannel.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="p-6 bg-white border rounded-xl shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center">
                                            <BrainCircuit className="w-8 h-8 text-purple-600" />
                                            <h2 className="ml-3 text-2xl font-bold text-gray-800">AI-Powered Insights</h2>
                                        </div>
                                        <button onClick={generateInsights} disabled={isGeneratingInsights} className="px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center">
                                            {isGeneratingInsights && <svg className="w-5 h-5 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                            {isGeneratingInsights ? 'Analyzing...' : 'Generate Insights'}
                                        </button>
                                    </div>
                                    <div className="p-4 mt-4 bg-gray-50 rounded-lg min-h-[150px] prose prose-sm max-w-none">
                                        {isGeneratingInsights && <p className="text-gray-500">The AI is analyzing your data...</p>}
                                        {insightsError && <p className="text-red-600">{insightsError}</p>}
                                        {insights && <div dangerouslySetInnerHTML={{ __html: parseMarkdown(insights) }} />}
                                        {!isGeneratingInsights && !insights && !insightsError && <p className="text-gray-500">Click "Generate Insights" for an AI analysis.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeView === 'bookings' && (
                           <div className="p-6 bg-white border rounded-xl shadow">
                                <h1 className="mb-4 text-2xl font-bold text-gray-800">All Bookings</h1>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Guest</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Dates</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Source</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Total</th>
                                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {bookings.map(booking => (
                                                <tr key={booking.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.guest?.name || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.arrival} to {booking.departure}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.source}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(booking.totalAmount || 0).toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'Booked' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {booking.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                           </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// A reusable component for displaying key statistics
const StatCard = ({ title, value }) => (
    <div className="p-5 bg-white border rounded-xl shadow">
        <h4 className="text-sm font-medium text-gray-500">{title}</h4>
        <p className="mt-1 text-3xl font-bold text-gray-800">{value}</p>
    </div>
);

