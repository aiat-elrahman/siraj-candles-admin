import React, { useState, useCallback, useEffect } from 'react';
import { Eye, X, RefreshCw } from 'lucide-react';

const API_BASE_URL = 'https://siraj-backend.onrender.com';

const OrderManager = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [viewingOrder, setViewingOrder] = useState(null);

    const fetchOrders = useCallback(async () => {
        setMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`);
            if (!response.ok) throw new Error(`Failed to fetch orders: ${response.statusText}`);
            const data = await response.json();
            setOrders(data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
            setMessage(`Error: Could not load orders. ${error.message}`);
            setOrders([]);
        }
    }, []);

    useEffect(() => {
        setIsLoading(true);
        fetchOrders().finally(() => setIsLoading(false));
    }, [fetchOrders]);

    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        if (!window.confirm(`Update order ${orderId.slice(-6)} status to "${newStatus}"?`)) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const result = await response.json();
            if (response.ok && result.order) {
                console.log(`Order ${orderId.slice(-6)} status updated.`);
                await fetchOrders();
            } else {
                setMessage(`Error updating order: ${result.message || result.error || `Status ${response.status}`}`);
                console.error('API Error:', result);
            }
        } catch (error) {
            setMessage(`Network Error: ${error.message}.`);
            console.error('Order Update Error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewOrder = (order) => setViewingOrder(order);
    const closeOrderView = () => setViewingOrder(null);

    return (
        <div className="space-y-6">
            <div className="bg-white shadow-xl rounded-2xl p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Order Management</h1>
                
                {message && (
                    <div className={`p-3 mb-6 rounded-lg font-medium text-sm border ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}>
                        {message}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No orders found yet.</p>
                ) : (
                    <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Order ID</th>
                                    <th scope="col" className="px-4 py-3">Date</th>
                                    <th scope="col" className="px-4 py-3">Customer</th>
                                    <th scope="col" className="px-4 py-3">Total (EGP)</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                    <th scope="col" className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order._id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap truncate" style={{maxWidth: '100px'}} title={order._id}>...{order._id.slice(-6)}</td>
                                        <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">{order.customerInfo?.name || 'N/A'}</td>
                                        <td className="px-4 py-3">{order.totalAmount?.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={order.status}
                                                onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                                className={`p-1 rounded text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                                    order.status === 'Delivered' ? 'bg-green-100 text-green-800 border-green-300' :
                                                    order.status === 'Shipped' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                    order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                    order.status === 'Cancelled' ? 'bg-red-100 text-red-800 border-red-300' :
                                                    'bg-gray-100 text-gray-800 border-gray-300'
                                                }`}
                                                disabled={isSubmitting}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Shipped">Shipped</option>
                                                <option value="Delivered">Delivered</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                            <button 
                                                onClick={() => handleViewOrder(order)} 
                                                title="View Details" 
                                                className="text-gray-500 hover:text-indigo-600 p-1 hover:bg-gray-100 rounded"
                                            >
                                                <Eye size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Order View Modal */}
            {viewingOrder && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4" onClick={closeOrderView}>
                    <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h3 className="text-xl font-semibold text-gray-900">Order Details (...{viewingOrder._id.slice(-6)})</h3>
                            <button onClick={closeOrderView} className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center">
                                <X size={20}/>
                                <span className="sr-only">Close modal</span>
                            </button>
                        </div>
                        <div className="text-sm space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><p><strong>Date:</strong> {new Date(viewingOrder.createdAt).toLocaleString()}</p></div>
                                <div><p><strong>Status:</strong> {viewingOrder.status}</p></div>
                                <div><p><strong>Customer:</strong> {viewingOrder.customerInfo.name}</p></div>
                                <div><p><strong>Email:</strong> {viewingOrder.customerInfo.email}</p></div>
                                <div><p><strong>Phone:</strong> {viewingOrder.customerInfo.phone}</p></div>
                                <div><p><strong>Payment:</strong> {viewingOrder.paymentMethod}</p></div>
                                <div className="md:col-span-2"><p><strong>Address:</strong> {viewingOrder.customerInfo.address}, {viewingOrder.customerInfo.city}</p></div>
                                {viewingOrder.customerInfo.notes && <div className="md:col-span-2"><p><strong>Notes:</strong> {viewingOrder.customerInfo.notes}</p></div>}
                            </div>
                            <hr/>
                            <p className="font-semibold mt-4"><strong>Items:</strong></p>
                            <ul className="list-disc list-inside space-y-1 pl-1">
                                {viewingOrder.items.map((item, index) => (
                                    <li key={index}>
                                        {item.name} x {item.quantity} @ {item.price?.toFixed(2)} EGP
                                        {item.customization && item.customization.length > 0 && <span className="text-xs text-gray-500"> ({item.customization.join(', ')})</span>}
                                    </li>
                                ))}
                            </ul>
                            <hr className="my-4"/>
                            <div className="grid grid-cols-2 gap-x-4 text-right">
                                <p>Subtotal:</p><p>{viewingOrder.subtotal?.toFixed(2)} EGP</p>
                                <p>Shipping:</p><p>{viewingOrder.shippingFee?.toFixed(2)} EGP</p>
                                <p className="font-bold">Total:</p><p className="font-bold">{viewingOrder.totalAmount?.toFixed(2)} EGP</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={closeOrderView} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderManager;