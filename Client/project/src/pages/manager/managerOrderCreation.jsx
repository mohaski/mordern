import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Check, CreditCard } from 'lucide-react';
import { paymentStatus, createOrder } from '../../services/api';

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
  number_of_pieces: z.number().min(1, "At least 1 piece is required"),
});

const OrderCreation = () => {
  const [step, setStep] = useState(1);
  const [parcels, setParcels] = useState([]);
  const [showNewParcelForm, setShowNewParcelForm] = useState(true);
  const [orderCost, setOrderCost] = useState(0);
  const [isPollingCost, setIsPollingCost] = useState(false);
  const [formData, setFormData] = useState({
    sender: {},
    receiver: {},
    parcels: [],
  });

  const handleAddParcel = (data) => {
    const newParcel = {
      content: data.content,
      weight: parseFloat(data.weight),
      number_of_pieces: parseInt(data.number_of_pieces)
    };
    
    setParcels(prevParcels => [...prevParcels, newParcel]);
    setShowNewParcelForm(false);
    resetParcel();
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      parcel: {
        content: '',
        weight: '',
        number_of_pieces: 1
      }
    }));
  };

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

  // Sender form submission
  const onSenderSubmit = async (data) => {
    try {
      const validatedData = senderSchema.parse(data);
      //const response = await saveSender(validatedData);
      sessionStorage.setItem('senderDetails', JSON.stringify(validatedData))
      setFormData(prev => ({ ...prev, sender: validatedData }));
      setStep(2);
    } catch (error) {
      console.error('Sender Error:', error);
    }
  };

  // Receiver form submission
  const onReceiverSubmit = async (data) => {
    try {
      const validatedData = receiverSchema.parse(data);
      sessionStorage.setItem('receiverDetails', JSON.stringify(validatedData))
      setFormData(prev => ({ ...prev, receiver: validatedData }));
      setStep(3);
    } catch (error) {
      console.error('Receiver Error:', error);
    }
  };

  const addNewParcel = () => {
    setShowNewParcelForm(true);
  };

  const handleContinue = async () => {
    if (parcels.length > 0) {
      const sender = sessionStorage.getItem('senderDetails');
      const receiver = sessionStorage.getItem('receiverDetails')
      const response = await createOrder(sender, receiver, parcels);
      console.log(response.data.order_id)
      sessionStorage.setItem('order_id', response.data.order_id);
      console.log(response)
      //sessionStorage.setItem('parcelDetails', JSON.stringify(parcels))
      setStep(4);
      startPollingCost();
    }
  };

  // Polling for order cost
  const startPollingCost = () => {
    setIsPollingCost(true);
    const pollInterval = setInterval(async () => {
      try {
        
        const response = await paymentStatus(order_id);
        console.log(response.data.order)
        const data = await response.json();
        if (data.cost > 0) {
          setOrderCost(data.cost);
          setIsPollingCost(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling cost:', error);
      }
    }, 60000); // Poll every 1 minute

    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPollingCost(false);
    }, 300000);
  };

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Walk-in Customer Order</h2>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Package className="h-5 w-5 text-yellow-400" />
                  </div>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    placeholder="john@example.com"
                  />
                  {senderErrors.email && (
                    <p className="mt-2 text-sm text-red-600">{senderErrors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number*</label>
                <input
                  type="tel"
                  {...senderRegister('phone_number')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="0712 345 678"
                />
                {senderErrors.phone_number && (
                  <p className="mt-2 text-sm text-red-600">{senderErrors.phone_number.message}</p>
                )}
              </div>

              <div className="flex justify-end mt-8">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        );

        case 2:
          return (
            <div>
              <h2 className="text-lg mb-6">Please fill in the receiver details</h2>
              <div key="receiver-form">
                 <form onSubmit={receiverHandleSubmit(onReceiverSubmit)} className="form-grid">
                <div className="form-group">
                  <label className="form-label">Name*</label>
                  <input
                    type="text"
                    {...receiverRegister('name')}
                    className="form-input"
                  />
                  {receiverErrors.rName && (
                    <p className="text-sm text-red-600 mt-1">{receiverErrors.rName.message}</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address*</label>
                  <input
                    type="email"
                    {...receiverRegister('email')}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City*</label>
                  <select
                    {...receiverRegister('county')}
                    className="form-select"
                  >
                    <option value="">Select city</option>
                    <option value="mombasa">Mombasa</option>
                    <option value="nairobi">Nairobi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone number*</label>
                  <input
                    type="tel"
                    {...receiverRegister('phone_number')}
                    placeholder="0712123456"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Building Name/Number*</label>
                  <input
                    type="text"
                    {...receiverRegister('building_name')}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Street name*</label>
                  <input
                    type="text"
                    {...receiverRegister('street_name')}
                    className="form-input"
                  />
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Nearest Landmark or W3W address</label>
                  <input
                    type="text"
                    {...receiverRegister('nearest_landmark')}
                    className="form-input"
                  />
                </div>
                <div className="button-container col-span-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="button button-back"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="button button-continue"
                  >
                    Continue
                  </button>
                </div>
              </form>
          </div>
             
            </div>
          );
  
          case 3:
            return (
              <div>
                <h2 className="text-xl font-medium mb-6">Shipment details</h2>
          
                {/* Existing parcels */}
                {parcels.map((parcel, index) => (
                  <div key={index} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                    <div>
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">Shipment Content description</label>
                        <div className="text-gray-900">{parcel.content}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">Total Gross Weight in kg</label>
                          <div className="text-gray-900">{parcel.weight}</div>
                        </div>
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">Number of Pieces</label>
                          <div className="text-gray-900">{parcel.number_of_pieces}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          
                {/* New parcel form */}
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
                        <label className="block text-gray-600 text-sm mb-1">Total Gross Weight in kg*</label>
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
                        {parcelErrors.number_0f_pieces && (
                          <p className="text-sm text-red-600 mt-1">{parcelErrors.number_of_pieces.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <button type="submit" className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">
                        add parcel
                      </button>
                    </div>
                  </form>
                )}
          
                {!showNewParcelForm && (
                  <button 
                    type="button"
                    onClick={addNewParcel}
                    className="button-add-parcel"
                  >
                    + Add Another Parcel
                  </button>
                )}
          
                <p className="text-sm text-gray-500 mt-4">
                  In case of additional parcels press the button above to fill its details.
                </p>
                
                <p className="text-sm text-gray-500 mt-2">
                  Price may change in case of any weight difference.
                </p>
          
                <div className="flex justify-between mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    disabled={parcels.length === 0}
                  >
                    Continue
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
                    <h3 className="text-lg font-medium">Sender: {formData.sender.sName}</h3>
                    <p className="text-gray-700">County: {formData.sender.sCounty}</p>
                    <p className="text-gray-700">Pickup Location: {formData.sender.sBuilding}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Receiver: {formData.receiver.rName}</h3>
                    <p className="text-gray-700">County: {formData.receiver.rCounty}</p>
                    <p className="text-gray-700">Delivery Location: {formData.receiver.rBuilding}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-red-600">
                    status: Pending cost calculation
                  </div>
                  <div className="text-xl font-medium">
                    Cost: {orderCost}
                  </div>
                </div>
              </div>
              
              <div className="text-center mb-8">
                <h3 className="text-lg font-medium mb-4">Please select the payment method</h3>
                <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                  <div className="text-center">
                    <button 
                      className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-red-500 flex flex-col items-center justify-center transition-colors"
                    >
                      <Banknote className="w-8 h-8 mb-2 text-gray-600" />
                      <span className="text-gray-600">Cash</span>
                    </button>
                  </div>
                  <div className="text-center">
                    <button 
                      className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-red-500 flex flex-col items-center justify-center transition-colors"
                    >
                      <CreditCard className="w-8 h-8 mb-2 text-gray-600" />
                      <span className="text-gray-600">Credit Card</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 text-red-600 bg-white border border-red-600 rounded-md hover:bg-red-50"
                >
                  Go Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="px-6 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
                  disabled={orderCost === 0}
                >
                  Continue
                </button>
              </div>
            </div>
          );
  
        case 5:
          return (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Order Confirmation</h2>
              <p className="text-lg mb-6">Amazing we are almost done</p>
              <div className="bg-gray-100 p-4 rounded-lg mb-6">
                {/* Display order summary here */}
              </div>
              <div className="flex justify-center">
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  onClick={() => console.log('Confirm order')}
                >
                  Confirm Order
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
          {['Sender details', 'Receiver details', 'Parcel details', 'Payment', 'Confirmation'].map((label, idx) => (
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
  
  export default OrderCreation;