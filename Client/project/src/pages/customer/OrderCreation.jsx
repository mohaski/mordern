import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, CreditCard, Check, Banknote } from 'lucide-react';
import { paymentStatus, createOrder } from '../../services/api';


const STORAGE_KEY = 'orderCreationState';


// Zod schemas
const senderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().min(10, "Phone number must be at least 10 digits"),
  county: z.string().min(1, "County is required"),
  building_name: z.string().min(1, "Building name/number is required"),
  street_name: z.string().min(1, "Street name is required"),
  nearest_landmark: z.string().optional(),
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
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { currentStep } = JSON.parse(saved);
      return currentStep;
    }
    return 1;
  });
  const [parcels, setParcels] = useState([]);
  const [showNewParcelForm, setShowNewParcelForm] = useState(true);
  const [orderCost, setOrderCost] = useState(0);
  const [updatedCostOrder, setUpdatedCostOrder] = useState({})
  const [isPollingCost, setIsPollingCost] = useState(false);

   // Save state to localStorage whenever it changes
   useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentStep: step,
      
    }));
  }, [step]);
  

  const handleAddParcel = (data) => {
    const newParcel = {
      content: data.content,
      weight: parseFloat(data.weight),
      number_of_pieces: parseInt(data.number_of_pieces)
    };
    
    setParcels(prevParcels => [...prevParcels, newParcel]);
    setShowNewParcelForm(false);
    resetParcel();
    
  }
  // Form hooks
  const { 
    register: senderRegister, 
    handleSubmit: senderHandleSubmit,
    formState: { errors: senderErrors }
  } = useForm({
    resolver: zodResolver(senderSchema),
    defaultValues: {},
  });

  const { 
    register: receiverRegister, 
    handleSubmit: receiverHandleSubmit,
    formState: { errors: receiverErrors }
  } = useForm({
    resolver: zodResolver(receiverSchema),
    defaultValues: {},
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
      const response = await createOrder(sender, receiver, parcels)
      console.log(response.data.order_id)

      sessionStorage.setItem('order_id', response.data.order_id);
      setStep(4);
      // Start polling immediately after reaching step 4
      await fetchCostImmediately(); // Add immediate fetch
      startPollingCost();
    }
  };

  // Immediate cost fetch function
const fetchCostImmediately = async () => {
  try {
    const order_id = sessionStorage.getItem('order_id');
    const response = await paymentStatus(order_id);
    const data = response.data.order[0][0];
    setUpdatedCostOrder(data);
    if (data.total_cost > 0) {
      setOrderCost(data.total_cost);
    }
  } catch (error) {
    console.error('Error fetching initial cost:', error);
  }
};

  // Polling for order cost
  const startPollingCost = () => {
    setIsPollingCost(true);
    const pollInterval = setInterval(async () => {
      try {
        const order_id = sessionStorage.getItem('order_id')
        const response = await paymentStatus(order_id);
        console.log(response.data.order[0][0])
        const data = response.data.order[0][0];
        setUpdatedCostOrder(data);
        console.log(updatedCostOrder)
        if (data.total_cost > 0) {
          setOrderCost(data.total_cost);
          setIsPollingCost(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling cost:', error);
      }
    }, 60000); // Poll every 1 minute

    // Cleanup after 5 minutes
    /*setTimeout(() => {
      clearInterval(pollInterval);
      setIsPollingCost(false);
    }, 300000);*/
  };

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-lg mb-6">Please fill in the sender details</h2>
            <div key="sender-form">
              <form onSubmit={senderHandleSubmit(onSenderSubmit)} className="form-grid">
              
              <div className="form-group">
                <label className="form-label">Name*</label>
                <input
                  type="text"
                  {...senderRegister('name')}
                  className="form-input"
                />
                {senderErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{senderErrors.name.message}</p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Email Address*</label>
                <input
                  type="email"
                  {...senderRegister('email')}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">City*</label>
                <select
                  {...senderRegister('county')}
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
                  {...senderRegister('phone_number')}
                  placeholder="0712123456"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Building Name/Number*</label>
                <input
                  type="text"
                  {...senderRegister('building_name')}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Street name*</label>
                <input
                  type="text"
                  {...senderRegister('street_name')}
                  className="form-input"
                />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Nearest Landmark or W3W address</label>
                <input
                  type="text"
                  {...senderRegister('nearest_landmark')}
                  className="form-input"
                />
              </div>
              <div className="button-container col-span-2">
                <button className="button button-back">
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
                {receiverErrors.name && (
                  <p className="text-sm text-red-600 mt-1">{receiverErrors.name.message}</p>
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
                      {parcelErrors.number_of_pieces && (
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

            {isPollingCost && (
              <div className="mt-4 text-blue-600">Calculating order cost...</div>
            )}
            
            <div className="bg-gray-100 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-8 border-b border-gray-300 pb-6 mb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Sender: {updatedCostOrder.SenderName}</h3>
                  <p className="text-gray-700">County: {updatedCostOrder.pickupcounty}</p>
                  <p className="text-gray-700">Pickup Location: {updatedCostOrder.pickupbuilding_name}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Receiver: {updatedCostOrder.receiverName}</h3>
                  <p className="text-gray-700">County: {updatedCostOrder.deliverCounty}</p>
                  <p className="text-gray-700">Delivery Location: {updatedCostOrder.delivery_building_name}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-red-600">
                  status: {updatedCostOrder.status}
                </div>
                <div className="text-xl font-medium">
                  Cost: {updatedCostOrder.total_cost}
                </div>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-lg font-medium mb-4">Please select the payment period</h3>
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                <div className="text-center">
                  <button 
                    className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-red-500 flex flex-col items-center justify-center transition-colors"
                  >
                    <Banknote className="w-8 h-8 mb-2 text-gray-600" />
                    <span className="text-gray-600">On-Delivery</span>
                  </button>
                </div>
                <div className="text-center">
                  <button 
                    className="w-full aspect-square rounded-lg border-2 border-gray-200 hover:border-red-500 flex flex-col items-center justify-center transition-colors"
                  >
                    <CreditCard className="w-8 h-8 mb-2 text-gray-600" />
                    <span className="text-gray-600">On-Pickup</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
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
                onClick={() => sendMessage()}
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