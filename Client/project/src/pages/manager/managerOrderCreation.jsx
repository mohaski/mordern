import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Package, Check, CreditCard, Calculator, Banknote } from 'lucide-react';
import { paymentStatus, createOrderManager, orderManagerConfirmOrder} from '../../services/api';

// Form validation schemas
const senderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
});

const receiverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
  county: z.string().min(1, "County is required"),
  building_name: z.string().min(1, "Building name/number is required"),
  street_name: z.string().min(1, "Street name is required"),
  nearest_landmark: z.string().optional(),
});

const parcelSchema = z.object({
  content: z.string().min(1, "Description is required"),
  weight: z.number().min(0.1, "Weight must be at least 0.1kg"),
  number_of_pieces: z.number().min(1, "At least 1 piece is requiredI"),
  amount: z.number().min(0, "Amount must be 0 or greater")
});

const ManagerOrderCreation = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [parcels, setParcels] = useState([]);
  const [showNewParcelForm, setShowNewParcelForm] = useState(true);
  const [orderCost, setOrderCost] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [formData, setFormData] = useState({
    sender: {},
    receiver: {},
    parcels: [],
  });
  const [orderData, setOrderData] = useState({});

  // Form hooks
  const { 
    register: senderRegister, 
    handleSubmit: senderHandleSubmit,
    formState: { errors: senderErrors }
  } = useForm({
    resolver: zodResolver(senderSchema),
    defaultValues: formData.sender,
  });

  const { 
    register: receiverRegister, 
    handleSubmit: receiverHandleSubmit,
    formState: { errors: receiverErrors }
  } = useForm({
    resolver: zodResolver(receiverSchema),
    defaultValues: formData.receiver,
  });

  const { 
    register: parcelRegister, 
    handleSubmit: parcelHandleSubmit,
    formState: { errors: parcelErrors },
    reset: resetParcel
  } = useForm({
    resolver: zodResolver(parcelSchema),
  });

  const handleAddParcel = (data) => {
    const newParcel = {
      content: data.content,
      weight: Number(data.weight),
      number_of_pieces: Number(data.number_of_pieces),
      amount: Number(data.amount)
    };
    
    setParcels(prev => [...prev, newParcel]);
    setShowNewParcelForm(false);
    resetParcel();
    
    setFormData(prev => ({
      ...prev,
      parcels: [...prev.parcels, newParcel]
    }));
  };

  const onSenderSubmit = async (data) => {
    try {
      setIsLoading(true);
      const validatedData = senderSchema.parse(data);
      sessionStorage.setItem('senderDetails', JSON.stringify(validatedData));
      setFormData(prev => ({ ...prev, sender: validatedData }));
      setStep(2);
    } catch (error) {
      console.error('Sender Error:', error);
      alert('Failed to save sender details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onReceiverSubmit = async (data) => {
    try {
      setIsLoading(true);
      const validatedData = receiverSchema.parse(data);
      sessionStorage.setItem('receiverDetails', JSON.stringify(validatedData));
      setFormData(prev => ({ ...prev, receiver: validatedData }));
      setStep(3);
    } catch (error) {
      console.error('Receiver Error:', error);
      alert('Failed to save receiver details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return parcels.reduce((sum, parcel) => sum + (Number(parcel.amount) || 0), 0).toFixed(2);
  };

  const handleContinue = async () => {
    if (parcels.length === 0) return;
    
    try {
      setIsLoading(true);
      const sender = sessionStorage.getItem('senderDetails');
      const receiver = sessionStorage.getItem('receiverDetails');
      const managerCounty = JSON.parse(sessionStorage.getItem('user')).county;
      const total_cost = calculateTotalCost();
      
      const response = await createOrderManager(managerCounty, sender, receiver, parcels, total_cost);
      sessionStorage.setItem('order_id', response.data.order_id);
      setStep(4);
      await fetchCostImmediately();
    } catch (error) {
      console.error('Order creation error:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCostImmediately = async () => {
    try {
      setIsLoading(true);
      const order_id = sessionStorage.getItem('order_id');
      const response = await paymentStatus(order_id);
      const data = response.data.order[0][0];
      setOrderData(data);
      if (data.total_cost > 0) {
        setOrderCost(data.total_cost);
      }
    } catch (error) {
      console.error('Error fetching cost:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    await orderManagerConfirmOrder(orderData.order_id, paymentMethod)
    navigate('/cashier');
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Walk-in Customer Order</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <Package className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Creating order for a walk-in customer. Payment will be handled at the counter.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={senderHandleSubmit(onSenderSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name*</label>
                  <input
                    type="text"
                    {...senderRegister('name')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="John Doe"
                  />
                  {senderErrors.name && (
                    <p className="mt-2 text-sm text-red-600">{senderErrors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address*</label>
                  <input
                    type="email"
                    {...senderRegister('email')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="john@example.com"
                  />
                  {senderErrors.email && (
                    <p className="mt-2 text-sm text-red-600">{senderErrors.email.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number*</label>
                  <input
                    type="tel"
                    {...senderRegister('phone_number')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="0712 345 678"
                  />
                  {senderErrors.phone_number && (
                    <p className="mt-2 text-sm text-red-600">{senderErrors.phone_number.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Processing...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-lg mb-6">Please fill in the receiver details</h2>
            <form onSubmit={receiverHandleSubmit(onReceiverSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name*</label>
                <input
                  type="text"
                  {...receiverRegister('name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {receiverErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address*</label>
                <input
                  type="email"
                  {...receiverRegister('email')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {receiverErrors.email && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City*</label>
                <select
                  {...receiverRegister('county')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select city</option>
                  <option value="mombasa">Mombasa</option>
                  <option value="nairobi">Nairobi</option>
                </select>
                {receiverErrors.county && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.county.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone number*</label>
                <input
                  type="tel"
                  {...receiverRegister('phone_number')}
                  placeholder="0712123456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {receiverErrors.phone_number && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.phone_number.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Building Name/Number*</label>
                <input
                  type="text"
                  {...receiverRegister('building_name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {receiverErrors.building_name && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.building_name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street name*</label>
                <input
                  type="text"
                  {...receiverRegister('street_name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {receiverErrors.street_name && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.street_name.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nearest Landmark</label>
                <input
                  type="text"
                  {...receiverRegister('nearest_landmark')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="md:col-span-2 flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Processing...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-xl font-medium mb-6">Shipment details</h2>
            {parcels.map((parcel, index) => (
              <div key={index} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-gray-600 text-sm mb-2">Shipment Content description</label>
                  <div className="text-gray-900">{parcel.content}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Total Gross Weight (kg)</label>
                    <div className="text-gray-900">{parcel.weight}</div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Number of Pieces</label>
                    <div className="text-gray-900">{parcel.number_of_pieces}</div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Amount (KES)</label>
                    <div className="text-gray-900">{parcel.amount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}

            {showNewParcelForm && (
              <form onSubmit={parcelHandleSubmit(handleAddParcel)} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Shipment Content description*</label>
                  <input
                    type="text"
                    {...parcelRegister('content')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  {parcelErrors.content && (
                    <p className="text-sm text-red-600 mt-1">{parcelErrors.content.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Total Gross Weight (kg)*</label>
                    <input
                      type="number"
                      step="0.1"
                      {...parcelRegister('weight', { valueAsNumber: true })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    {parcelErrors.weight && (
                      <p className="text-sm text-red-600 mt-1">{parcelErrors.weight.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Number of Pieces*</label>
                    <input
                      type="number"
                      {...parcelRegister('number_of_pieces', { valueAsNumber: true })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                    {parcelErrors.number_of_pieces && (
                      <p className="text-sm text-red-600 mt-1">{parcelErrors.number_of_pieces.message}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-600 text-sm mb-1">Amount (KES)*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...parcelRegister('amount', { valueAsNumber: true })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                    {parcelErrors.amount && (
                      <p className="text-sm text-red-600 mt-1">{parcelErrors.amount.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {isLoading ? 'Adding...' : 'Add Parcel'}
                  </button>
                </div>
              </form>
            )}

            {!showNewParcelForm && (
              <button 
                onClick={() => setShowNewParcelForm(true)}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
              >
                + Add Another Parcel
              </button>
            )}

            <div className="mt-6 bg-gray-50 p-4 rounded-lg flex justify-between items-center">
              <div className="flex items-center text-gray-700">
                <Calculator className="h-5 w-5 mr-2" />
                <span className="font-medium">Total Cost:</span>
              </div>
              <div className="text-xl font-semibold text-gray-900">
                KES {calculateTotalCost()}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={handleContinue}
                disabled={parcels.length === 0 || isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {isLoading ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-xl font-medium mb-6">Amazing we are almost done</h2>
            
            <div className="bg-gray-100 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-8 border-b border-gray-300 pb-6 mb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Sender: {orderData.SenderName || 'N/A'}</h3>
                  <p className="text-gray-700">Pickup Location: {orderData.pickupbuilding_name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Receiver: {orderData.receiverName || 'N/A'}</h3>
                  <p className="text-gray-700">County: {orderData.deliverCounty || 'N/A'}</p>
                  <p className="text-gray-700">Delivery Location: {orderData.delivery_building_name || 'N/A'} {orderData.delivery_street_name || ''}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-red-600">
                  Status: Waiting confirmation
                </div>
                <div className="text-xl font-medium">
                  Cost: KES {orderCost || calculateTotalCost()}
                </div>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-lg font-medium mb-4">Please select the payment method</h3>
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`w-full aspect-square rounded-lg border-2 ${
                    paymentMethod === 'cash' ? 'border-red-500' : 'border-gray-200'
                  } hover:border-red-500 flex flex-col items-center justify-center transition-colors`}
                >
                  <Banknote className="w-8 h-8 mb-2 text-gray-600" />
                  <span className="text-gray-600">Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full aspect-square rounded-lg border-2 ${
                    paymentMethod === 'card' ? 'border-red-500' : 'border-gray-200'
                  } hover:border-red-500 flex flex-col items-center justify-center transition-colors`}
                >
                  <CreditCard className="w-8 h-8 mb-2 text-gray-600" />
                  <span className="text-gray-600">Credit Card</span>
                </button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handleConfirmOrder}
                disabled={isLoading || !paymentMethod}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
              >
                {isLoading ? 'Confirming...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="form-container">
      <div className="progress-bar">
        <div className="progress-line">
          <div 
            className="progress-line-fill" 
            style={{ width: `${((step - 1) / 4) * 100}%` }} 
          />
        </div>
        {['Sender details', 'Receiver details', 'Parcel details', 'Payment'].map((label, idx) => (
          <div key={idx} className="progress-step">
            <div className={`step-number ${
              step === idx + 1 ? 'active' : 
              step > idx + 1 ? 'completed' : ''
            }`}>
              {step > idx + 1 ? <Check size={16} /> : idx + 1}
            </div>
            <span className={`step-label ${step === idx + 1 ? 'active' : ''}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
      {renderStep()}
    </div>
  );
};

export default ManagerOrderCreation;