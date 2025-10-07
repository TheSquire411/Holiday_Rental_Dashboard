import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, BrainCircuit, LayoutDashboard, Hotel, AlertTriangle, RefreshCw, Calendar as CalendarIcon, Send } from 'lucide-react';

// --- Helper Functions & Constants ---

// Simple markdown-to-HTML parser for AI insights
const parseMarkdown = (text) => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italics
        .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>') // List items
        .replace(/\n/g, '<br />'); // NEW: Convert newlines to line breaks
};

// Colors for charts - using a modern, professional palette
const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f97316', '#ec4899'];

// --- MOCK DATA ---
// This sample data is used if the API call fails, allowing the UI to still be viewed.
const MOCK_BOOKINGS = [
    { id: 1, guest: { name: 'John Doe' }, arrival: '2024-01-15', departure: '2024-01-20', total_amount: 500, source: 'Airbnb', status: 'Booked', creation_date: '2023-12-15T10:00:00Z' },
    { id: 2, guest: { name: 'Jane Smith' }, arrival: '2024-02-10', departure: '2024-02-15', total_amount: 650, source: 'Booking.com', status: 'Booked', creation_date: '2024-01-10T10:00:00Z' },
    { id: 3, guest: { name: 'Peter Jones' }, arrival: '2024-02-20', departure: '2024-02-25', total_amount: 550, source: 'Direct', status: 'Booked', creation_date: '2024-02-01T10:00:00Z' },
    { id: 4, guest: { name: 'Mary Williams' }, arrival: '2024-03-05', departure: '2024-03-10', total_amount: 700, source: 'Airbnb', status: 'Cancelled', creation_date: '2024-02-15T10:00:00Z' },
];


// --- Main App Component ---
export default function App() {
    // --- STATE MANAGEMENT ---
    const [allBookings, setAllBookings] = useState([]); // All bookings fetched from API
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeView, setActiveView] = useState('dashboard');
    
    // Date Range State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // AI Insights State
    const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
    const [insights, setInsights] = useState('');
    const [insightsError, setInsightsError] = useState(null);
    const [userQuestion, setUserQuestion] = useState(''); // State for the user's question

    // --- API & DATA FETCHING ---
    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        setIsLoading(true);
        setError(null);
        
        const API_PROXY_URL = '/api/bookings';

        try {
            const response = await fetch(API_PROXY_URL);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API call failed with status ${response.status}`);
            }

            const data = await response.json();
            setAllBookings(data.items || []);

        } catch (err) {
            console.error("Error fetching bookings:", err);
            let detailedError = `Failed to fetch bookings from the server. This could mean the Lodgify API key is missing or incorrect in your Vercel project settings. The app is showing sample data. Error: ${err.message}`;
            setError(detailedError);
            setAllBookings(MOCK_BOOKINGS);
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- DATA PROCESSING & MEMOIZATION ---
    // This hook recalculates data only when bookings or date range change
    const processedData = useMemo(() => {
        if (!allBookings) return {};

        // 1. Filter bookings by the selected date range
        const filteredBookings = allBookings.filter(booking => {
            if (!startDate && !endDate) return true;
            if (startDate && !endDate) return new Date(booking.arrival) >= new Date(startDate);
            if (!startDate && endDate) return new Date(booking.arrival) <= new Date(endDate);
            return new Date(booking.arrival) >= new Date(startDate) && new Date(booking.arrival) <= new Date(endDate);
        });

        const confirmedBookings = filteredBookings.filter(b => b.status === 'Booked');
        const cancelledBookings = filteredBookings.filter(b => b.status === 'Cancelled');

        // 2. Calculate KPIs
        const totalRevenue = confirmedBookings.reduce((acc, b) => acc + (b.total_amount || 0), 0);
        const totalBookings = confirmedBookings.length;
        const totalNights = confirmedBookings.reduce((acc, b) => acc + ((new Date(b.departure) - new Date(b.arrival)) / (1000 * 3600 * 24) || 0), 0);
        const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
        const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0;
        const avgLengthOfStay = totalBookings > 0 ? totalNights / totalBookings : 0;
        const totalLeadTime = confirmedBookings.reduce((acc, b) => {
            if (!b.creation_date) return acc;
            const leadDays = (new Date(b.arrival) - new Date(b.creation_date)) / (1000 * 3600 * 24);
            return acc + (leadDays > 0 ? leadDays : 0);
        }, 0);
        const avgLeadTime = totalBookings > 0 ? totalLeadTime / totalBookings : 0;
        const cancellationRate = filteredBookings.length > 0 ? (cancelledBookings.length / filteredBookings.length) * 100 : 0;
        
        // 3. Prepare data for charts
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
            channelData[source].revenue += (booking.total_amount || 0);
        });
        const bookingsByMonth = Object.values(monthlyData).sort((a, b) => a.monthIndex - b.monthIndex);
        const revenueByChannel = Object.values(channelData);

        return { totalRevenue, totalBookings, avgBookingValue, avgNightlyRate, bookingsByMonth, revenueByChannel, totalNights, avgLengthOfStay, avgLeadTime, cancellationRate, filteredBookings };
    }, [allBookings, startDate, endDate]);


    // --- AI INSIGHTS GENERATION ---
    const handleAskAI = async (e) => {
        e.preventDefault();
        const question = userQuestion.trim();
        if (!question) {
            setInsightsError("Please enter a question.");
            return;
        }

        if (!processedData.filteredBookings || processedData.filteredBookings.length === 0) {
            setInsightsError("No booking data available in the selected date range to analyze.");
            return;
        }

        setIsGeneratingInsights(true);
        setInsights('');
        setInsightsError(null);

        const systemPrompt = `You are a vacation rental data analyst. Your task is to answer questions based ONLY on the provided booking data. Do not make up information. If the data does not contain the answer, state that clearly. Be concise and direct in your answers. **Format your response using markdown with paragraphs, bold headings, and bullet points for clarity.**`;

        // The AI doesn't need all the raw data, just what's relevant.
        const simplifiedData = processedData.filteredBookings.map(b => ({
            arrival: b.arrival,
            departure: b.departure,
            nights: (new Date(b.departure) - new Date(b.arrival)) / (1000 * 60 * 60 * 24),
            total_amount: b.total_amount,
            source: b.source,
            status: b.status,
            creation_date: b.creation_date
        }));
            
        const userQuery = `
        Here is the booking data for the selected period in JSON format:
        ${JSON.stringify(simplifiedData, null, 2)}

        ---
        Please answer the following question based on the data above:
        "${question}"
        `;

        const insightsApiUrl = '/api/generate-insights';

        try {
            const response = await fetch(insightsApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Insights API error: ${response.status}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) setInsights(text); else throw new Error("Received an empty response from the AI.");

        } catch (err) {
            console.error("Error generating insights:", err);
            setInsightsError(`Failed to get an answer. ${err.message}`);
        } finally {
            setIsGeneratingInsights(false);
            setUserQuestion(''); // Clear the input field
        }
    };
    
    // Main App Layout
    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="flex items-center justify-center h-16 border-b"><FileText className="w-8 h-8 text-blue-600" /><span className="ml-2 text-xl font-bold text-gray-800">Lodgify AI</span></div>
                <nav className="flex-grow p-4 space-y-2">
                    <a href="#" onClick={() => setActiveView('dashboard')} className={`flex items-center px-4 py-2 text-gray-700 rounded-lg transition-colors ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}><LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard</a>
                    <a href="#" onClick={() => setActiveView('bookings')} className={`flex items-center px-4 py-2 text-gray-700 rounded-lg transition-colors ${activeView === 'bookings' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}><Hotel className="w-5 h-5 mr-3" /> All Bookings</a>
                </nav>
            </aside>

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">{activeView === 'dashboard' ? 'Analytics Dashboard' : 'All Bookings'}</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-gray-500" /><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" /><span className="text-gray-500">-</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" /></div>
                        <button onClick={fetchBookings} disabled={isLoading} className="flex items-center px-4 py-2 text-sm font-semibold text-blue-600 bg-white border border-blue-300 rounded-lg shadow-sm hover:bg-blue-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"><RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />{isLoading ? 'Refreshing...' : 'Refresh'}</button>
                    </div>
                </div>

                {isLoading && allBookings.length === 0 ? (
                     <div className="flex items-center justify-center h-full"><div className="text-center"><svg className="w-12 h-12 mx-auto text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="mt-2 text-gray-600">Loading bookings...</p></div></div>
                ) : (
                    <>
                        {error && <div className="p-4 mb-4 text-sm text-yellow-800 bg-yellow-100 border border-yellow-300 rounded-lg flex items-center" role="alert"><AlertTriangle className="w-5 h-5 mr-3" /><div><span className="font-medium">Warning:</span> {error}</div></div>}
                        
                        {activeView === 'dashboard' && processedData.bookingsByMonth && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                                    <StatCard title="Total Revenue" value={`$${(processedData.totalRevenue || 0).toFixed(2)}`} /><StatCard title="Total Bookings" value={processedData.totalBookings || 0} /><StatCard title="Total Nights Booked" value={processedData.totalNights || 0} /><StatCard title="Cancellation Rate" value={`${(processedData.cancellationRate || 0).toFixed(1)}%`} /><StatCard title="Avg. Booking Value" value={`$${(processedData.avgBookingValue || 0).toFixed(2)}`} /><StatCard title="Avg. Nightly Rate" value={`$${(processedData.avgNightlyRate || 0).toFixed(2)}`} /><StatCard title="Avg. Length of Stay" value={`${(processedData.avgLengthOfStay || 0).toFixed(1)} nights`} /><StatCard title="Avg. Lead Time" value={`${(processedData.avgLeadTime || 0).toFixed(1)} days`} />
                                </div>
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                                    <div className="lg:col-span-3 p-4 bg-white border rounded-xl shadow"><h3 className="font-semibold text-gray-700">Bookings per Month</h3><ResponsiveContainer width="100%" height={300}><BarChart data={processedData.bookingsByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip wrapperClassName="rounded-md border bg-white shadow-sm" /><Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                                    <div className="lg:col-span-2 p-4 bg-white border rounded-xl shadow"><h3 className="font-semibold text-gray-700">Revenue by Channel</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={processedData.revenueByChannel} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>{processedData.revenueByChannel.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} /><Legend /></PieChart></ResponsiveContainer></div>
                                </div>
                                <div className="p-6 bg-white border rounded-xl shadow">
                                    <div className="flex items-center mb-4"><BrainCircuit className="w-8 h-8 text-purple-600" /><h2 className="ml-3 text-2xl font-bold text-gray-800">Ask a Question About Your Bookings</h2></div>
                                    <div className="p-4 bg-gray-50 rounded-lg min-h-[150px] prose prose-sm max-w-none">{isGeneratingInsights && <p className="text-gray-500">The AI is thinking...</p>}{insightsError && <p className="text-red-600">{insightsError}</p>}{insights && <div dangerouslySetInnerHTML={{ __html: parseMarkdown(insights) }} />}{!isGeneratingInsights && !insights && !insightsError && <p className="text-gray-500">Ask a question like "How many bookings did I get from Airbnb?" or "What was my total revenue in October?" for the selected date range.</p>}</div>
                                    <form onSubmit={handleAskAI} className="flex items-center gap-2 mt-4">
                                        <input type="text" value={userQuestion} onChange={e => setUserQuestion(e.target.value)} placeholder="Ask your question..." className="flex-grow w-full px-3 py-2 text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        <button type="submit" disabled={isGeneratingInsights} className="px-4 py-2 font-semibold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center"><Send className="w-4 h-4 mr-2" />{isGeneratingInsights ? 'Asking...' : 'Ask'}</button>
                                    </form>
                                </div>
                            </div>
                        )}
                        {activeView === 'bookings' && (
                           <div className="p-6 bg-white border rounded-xl shadow">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr><th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Guest</th><th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Dates</th><th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Source</th><th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Total</th><th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Status</th></tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {processedData.filteredBookings.slice().sort((a, b) => new Date(a.arrival) - new Date(b.arrival)).map(booking => (
                                                <tr key={booking.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.guest?.name || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.arrival} to {booking.departure}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.source}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(booking.total_amount || 0).toFixed(2)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'Booked' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{booking.status}</span></td>
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
        <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
    </div>
);


