import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, MapPin, ArrowLeft, Truck, Calculator } from 'lucide-react';
import { getPayment, processPayment } from '../../services/api';

const OrderDetails = () => {
  const { order_id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cost, setCost] = useState('');
  const [parcelCosts, setParcelCosts] = useState({});

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        console.log(order_id);
        const response = await getPayment(order_id);
        setOrder(response.data.order);
        console.log(response.data.order);
      } catch (err) {
        setError(err.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [order_id]);

  const handleParcelCostChange = (index, value) => {
    setParcelCosts((prevCosts) => ({
      ...prevCosts,
      [index]: value,
    }));
  };

  const calculateTotalCost = () => {
    return Object.values(parcelCosts).reduce((acc, cost) => acc + (parseFloat(cost) || 0), 0);
  };

  const handleUpdateCost = async (e) => {
    e.preventDefault();
    const totalCost = calculateTotalCost();

    if (totalCost <= 0) {
      setError('Please enter valid costs for all parcels');
      return;
    }

    try {
      const processPaymentDetails = {
        order_id: order[0].order_id,
        amounts: Object.values(parcelCosts).map((cost) => parseFloat(cost)),
        total_cost: totalCost,
      };

      console.log(processPaymentDetails);

      await processPayment(processPaymentDetails.order_id, processPaymentDetails.amounts, processPaymentDetails.total_cost);

      // Redirect with a query parameter to trigger a fetch
      navigate('/cashier/cost-update?refresh=true');
    } catch (err) {
      setError(err.message || 'Failed to update cost');
    }
  };

  if (loading) return <div className="text-center p-8">Loading order details...</div>;
  if (error) return <div className="text-center p-8 text-red-600">Error: {error}</div>;
  if (!order) return <div className="text-center p-8">Order not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Orders
        </button>
        <div className="flex items-center bg-gray-100 px-4 py-2 rounded-lg">
          <Calculator className="h-5 w-5 text-gray-500 mr-2" />
          <span className="text-gray-700 font-medium">Total Cost: KES {calculateTotalCost().toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Order #{order[0].order_id}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Created on {new Date(order[0].created_at).toLocaleDateString()}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Pending Cost
            </span>
          </div>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-base font-medium text-gray-900 mb-4">Sender Details</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">{order[0].SenderName}</span>
                </div>
                <div className="ml-7 space-y-1">
                  <p className="text-gray-600">{order[0].SenderPhone_number}</p>
                  <p className="text-gray-600">{order[0].SenderEmail}</p>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-1" />
                  <div>
                    <p className="text-gray-900">{order[0].pickupbuilding_name}</p>
                    <p className="text-gray-600">{order[0].pickupstreet_name}</p>
                    <p className="text-gray-600">{order[0].pickupcounty}</p>
                    {order[0].pickupnearest_landmark && (
                      <p className="text-gray-500 text-sm">Near: {order[0].pickupnearest_landmark}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-base font-medium text-gray-900 mb-4">Receiver Details</h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Package className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-gray-900">{order[0].receiverName}</span>
                </div>
                <div className="ml-7 space-y-1">
                  <p className="text-gray-600">{order[0].receiverPhone_number}</p>
                  <p className="text-gray-600">{order[0].receiverEmail}</p>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-1" />
                  <div>
                    <p className="text-gray-900">{order[0].delivery_building_name}</p>
                    <p className="text-gray-600">{order[0].delivery_street_name}</p>
                    <p className="text-gray-600">{order[0].deliverCounty}</p>
                    {order[0].delivery_nearest_landmark && (
                      <p className="text-gray-500 text-sm">Near: {order[0].delivery_nearest_landmark}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Parcel Details & Costs</h4>
        </div>
        <div className="p-4">
          <form onSubmit={handleUpdateCost}>
            <div className="space-y-6">
              {order.map((parcel, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Truck className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">Parcel {index + 1}</span>
                      </div>
                      <div className="ml-7">
                        <p className="text-gray-600">{parcel.content}</p>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Weight: {parcel.weight} kg</span>
                          <span>Pieces: {parcel.number_of_pieces}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parcel Cost
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">KES</span>
                        </div>
                        <input
                          type="number"
                          value={parcelCosts[index]}
                          onChange={(e) => handleParcelCostChange(index, e.target.value)}
                          className="block w-full pl-14 pr-4 sm:text-sm border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                          placeholder="0.00"
                          min="0"
                          step="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Update All Costs
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;