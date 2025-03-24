import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, CreditCard, Check, Banknote } from 'lucide-react';
import { paymentStatus, createOrder, confirmOrder } from '../../services/api';

const STORAGE_KEY = 'orderCreationState';

// Zod schemas (unchanged)
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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).currentStep : 1;
    } catch (error) {
      console.error("Error parsing saved step:", error);
      return 1;
    }
  });

  const [parcels, setParcels] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).parcels || [] : [];
  });
  const [showNewParcelForm, setShowNewParcelForm] = useState(true);
  const [orderCost, setOrderCost] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).orderCost || 0 : 0;
  });
  const [updatedCostOrder, setUpdatedCostOrder] = useState({});
  const [isPollingCost, setIsPollingCost] = useState(false);
  const [paymentTime, setPaymentTime] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).paymentTime || null : null;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentStep: step,
      parcels,
      orderCost,
      paymentTime,
    }));
  }, [step, parcels, orderCost, paymentTime]);

  // Trigger fetch and polling on mount if step is 4 and cost is not yet fetched
  useEffect(() => {
    if (step === 4 && orderCost === 0) {
      const order_id = sessionStorage.getItem('order_id');
      if (order_id) {
        fetchCostImmediately();
        startPollingCost();
      } else {
        console.warn('No order_id found in sessionStorage, resetting to step 1');
        setStep(1); // Reset if order_id is missing
      }
    }
  }, [step]); // Dependency on step ensures this runs when step changes

  const handleAddParcel = (data) => {
    const newParcel = {
      content: data.content,
      weight: parseFloat(data.weight),
      number_of_pieces: parseInt(data.number_of_pieces),
    };
    setParcels(prevParcels => [...prevParcels, newParcel]);
    setShowNewParcelForm(false);
    resetParcel();
  };

  // Form hooks (unchanged)
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

  // Sender form submission (unchanged)
  const onSenderSubmit = async (data) => {
    try {
      const validatedData = senderSchema.parse(data);
      sessionStorage.setItem('senderDetails', JSON.stringify(validatedData));
      setStep(2);
    } catch (error) {
      console.error('Sender Error:', error);
    }
  };

  // Receiver form submission (unchanged)
  const onReceiverSubmit = async (data) => {
    try {
      const validatedData = receiverSchema.parse(data);
      sessionStorage.setItem('receiverDetails', JSON.stringify(validatedData));
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
      const receiver = sessionStorage.getItem('receiverDetails');
      const response = await createOrder(sender, receiver, parcels);
      console.log('Order created with ID:', response.data.order_id);

      sessionStorage.setItem('order_id', response.data.order_id);
      setStep(4);
      await fetchCostImmediately();
      startPollingCost();
    }
  };

  // Immediate cost fetch function
  const fetchCostImmediately = async () => {
    try {
      const order_id = sessionStorage.getItem('order_id');
      if (!order_id) throw new Error('No order_id found in sessionStorage');
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
    if (isPollingCost) return; // Prevent multiple intervals
    setIsPollingCost(true);
    const pollInterval = setInterval(async () => {
      try {
        const order_id = sessionStorage.getItem('order_id');
        if (!order_id) throw new Error('No order_id found in sessionStorage');
        const response = await paymentStatus(order_id);
        const data = response.data.order[0][0];
        setUpdatedCostOrder(data);
        if (data.total_cost > 0) {
          setOrderCost(data.total_cost);
          setIsPollingCost(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling cost:', error);
      }
    }, 30000); // Poll every 30 seconds

    // Cleanup interval when component unmounts or polling stops
    return () => clearInterval(pollInterval);
  };

  // Confirm order with selected payment time (unchanged)
  const handleConfirmOrder = async () => {
    try {
      const order_id = sessionStorage.getItem('order_id');
      if (!order_id || !paymentTime) {
        throw new Error('Order ID or payment time missing');
      }

      const response = await confirmOrder(order_id, paymentTime);
      console.log('Order confirmed:', response.data);

      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem('senderDetails');
      sessionStorage.removeItem('receiverDetails');
      sessionStorage.removeItem('order_id');
      setParcels([]);
      setOrderCost(0);
      setPaymentTime(null);
      setStep(1);
    } catch (error) {
      console.error('Confirm Order Error:', error);
      alert('Failed to confirm order: ' + (error.message || 'Unknown error'));
    }
  };

  // Render current step (unchanged except Step 5 for completeness)
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
                  <input type="text" {...senderRegister('name')} className="form-input" />
                  {senderErrors.name && <p className="text-sm text-red-600 mt-1">{senderErrors.name.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address*</label>
                  <input type="email" {...senderRegister('email')} className="form-input" />
                  {senderErrors.email && <p className="text-sm text-red-600 mt-1">{senderErrors.email.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">City*</label>
                  <select {...senderRegister('county')} className="form-select">
                    <option value="">Select city</option>
                    <option value="mombasa">Mombasa</option>
                    <option value="nairobi">Nairobi</option>
                  </select>
                  {senderErrors.county && <p className="text-sm text-red-600 mt-1">{senderErrors.county.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone number*</label>
                  <input type="tel" {...senderRegister('phone_number')} placeholder="0712123456" className="form-input" />
                  {senderErrors.phone_number && <p className="text-sm text-red-600 mt-1">{senderErrors.phone_number.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Building Name/Number*</label>
                  <input type="text" {...senderRegister('building_name')} className="form-input" />
                  {senderErrors.building_name && <p className="text-sm text-red-600 mt-1">{senderErrors.building_name.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Street name*</label>
                  <input type="text" {...senderRegister('street_name')} className="form-input" />
                  {senderErrors.street_name && <p className="text-sm text-red-600 mt-1">{senderErrors.street_name.message}</p>}
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Nearest Landmark or W3W address</label>
                  <input type="text" {...senderRegister('nearest_landmark')} className="form-input" />
                </div>
                <div className="button-container col-span-2">
                  <button className="button button-back" disabled>Go Back</button>
                  <button type="submit" className="button button-continue">Continue</button>
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
                  <input type="text" {...receiverRegister('name')} className="form-input" />
                  {receiverErrors.name && <p className="text-sm text-red-600 mt-1">{receiverErrors.name.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address*</label>
                  <input type="email" {...receiverRegister('email')} className="form-input" />
                  {receiverErrors.email && <p className="text-sm text-red-600 mt-1">{receiverErrors.email.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">City*</label>
                  <select {...receiverRegister('county')} className="form-select">
                    <option value="">Select city</option>
                    <option value="mombasa">Mombasa</option>
                    <option value="nairobi">Nairobi</option>
                  </select>
                  {receiverErrors.county && <p className="text-sm text-red-600 mt-1">{receiverErrors.county.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone number*</label>
                  <input type="tel" {...receiverRegister('phone_number')} placeholder="0712123456" className="form-input" />
                  {receiverErrors.phone_number && <p className="text-sm text-red-600 mt-1">{receiverErrors.phone_number.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Building Name/Number*</label>
                  <input type="text" {...receiverRegister('building_name')} className="form-input" />
                  {receiverErrors.building_name && <p className="text-sm text-red-600 mt-1">{receiverErrors.building_name.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Street name*</label>
                  <input type="text" {...receiverRegister('street_name')} className="form-input" />
                  {receiverErrors.street_name && <p className="text-sm text-red-600 mt-1">{receiverErrors.street_name.message}</p>}
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Nearest Landmark or W3W address</label>
                  <input type="text" {...receiverRegister('nearest_landmark')} className="form-input" />
                </div>
                <div className="button-container col-span-2">
                  <button type="button" onClick={() => setStep(1)} className="button button-back">Go Back</button>
                  <button type="submit" className="button button-continue">Continue</button>
                </div>
              </form>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-xl font-medium mb-6">Shipment details</h2>
            {parcels.map((parcel, index) => (
              <div key={index} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
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
            ))}
            {showNewParcelForm && (
              <form onSubmit={parcelHandleSubmit(handleAddParcel)} className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Shipment Content description*</label>
                  <input type="text" {...parcelRegister('content')} className="w-full p-2 border border-gray-300 rounded-md" />
                  {parcelErrors.content && <p className="text-sm text-red-600 mt-1">{parcelErrors.content.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Total Gross Weight in kg*</label>
                    <input type="number" step="0.1" {...parcelRegister('weight', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-md" />
                    {parcelErrors.weight && <p className="text-sm text-red-600 mt-1">{parcelErrors.weight.message}</p>}
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Number of Pieces*</label>
                    <input type="number" {...parcelRegister('number_of_pieces', { valueAsNumber: true })} className="w-full p-2 border border-gray-300 rounded-md" />
                    {parcelErrors.number_of_pieces && <p className="text-sm text-red-600 mt-1">{parcelErrors.number_of_pieces.message}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <button type="submit" className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700">Add Parcel</button>
                </div>
              </form>
            )}
            {!showNewParcelForm && (
              <button type="button" onClick={addNewParcel} className="button-add-parcel">+ Add Another Parcel</button>
            )}
            <p className="text-sm text-gray-500 mt-4">In case of additional parcels press the button above to fill its details.</p>
            <p className="text-sm text-gray-500 mt-2">Price may change in case of any weight difference.</p>
            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => setStep(2)} className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Go Back</button>
              <button type="button" onClick={handleContinue} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700" disabled={parcels.length === 0}>Continue</button>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-xl font-medium mb-6">Amazing, we are almost done</h2>
            {isPollingCost && <div className="mt-4 text-blue-600">Calculating order cost...</div>}
            <div className="bg-gray-100 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-8 border-b border-gray-300 pb-6 mb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Sender: {updatedCostOrder.SenderName || 'N/A'}</h3>
                  <p className="text-gray-700">County: {updatedCostOrder.pickupcounty || 'N/A'}</p>
                  <p className="text-gray-700">Pickup Location: {updatedCostOrder.pickupbuilding_name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Receiver: {updatedCostOrder.receiverName || 'N/A'}</h3>
                  <p className="text-gray-700">County: {updatedCostOrder.deliverCounty || 'N/A'}</p>
                  <p className="text-gray-700">Delivery Location: {updatedCostOrder.delivery_building_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-red-600">Status: {updatedCostOrder.status || 'Pending'}</div>
                <div className="text-xl font-medium">Cost: {orderCost > 0 ? orderCost : 'Calculating...'}</div>
              </div>
            </div>
            <div className="text-center mb-8">
              <h3 className="text-lg font-medium mb-4">Please select the payment period</h3>
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                <div className="text-center">
                  <button
                    onClick={() => setPaymentTime('on-delivery')}
                    className={`w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                      paymentTime === 'on-delivery' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <Banknote className="w-8 h-8 mb-2 text-gray-600" />
                    <span className="text-gray-600">On-Delivery</span>
                  </button>
                </div>
                <div className="text-center">
                  <button
                    onClick={() => setPaymentTime('on-pickup')}
                    className={`w-full aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${
                      paymentTime === 'on-pickup' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-500'
                    }`}
                  >
                    <CreditCard className="w-8 h-8 mb-2 text-gray-600" />
                    <span className="text-gray-600">On-Pickup</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(3)} className="px-6 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Go Back</button>
              <button
                onClick={() => setStep(5)}
                className={`px-6 py-2 rounded-md text-white ${orderCost > 0 && paymentTime ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
                disabled={orderCost === 0 || !paymentTime}
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
            <p className="text-lg mb-6">Amazing, we are almost done</p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-2 gap-8 border-b border-gray-300 pb-6 mb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Sender: {updatedCostOrder.SenderName || 'N/A'}</h3>
                  <p className="text-gray-700">County: {updatedCostOrder.pickupcounty || 'N/A'}</p>
                  <p className="text-gray-700">Pickup Location: {updatedCostOrder.pickupbuilding_name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Receiver: {updatedCostOrder.receiverName || 'N/A'}</h3>
                  <p className="text-gray-700">County: {updatedCostOrder.deliverCounty || 'N/A'}</p>
                  <p className="text-gray-700">Delivery Location: {updatedCostOrder.delivery_building_name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-red-600">Status: {updatedCostOrder.status || 'Pending'}</div>
                <div className="text-xl font-medium">Cost: {orderCost}</div>
              </div>
              <div className="mt-4 text-gray-700">Payment Time: {paymentTime === 'on-delivery' ? 'On-Delivery' : 'On-Pickup'}</div>
            </div>
            <div className="flex justify-center">
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={handleConfirmOrder}
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
          <div className="progress-line-fill" style={{ width: `${((step - 1) / 4) * 100}%` }} />
        </div>
        {['Sender details', 'Receiver details', 'Parcel details', 'Payment', 'Confirmation'].map((label, idx) => (
          <div key={idx} className="progress-step">
            <div className={`step-number ${step === idx + 1 ? 'active' : step > idx + 1 ? 'completed' : ''}`}>
              {step > idx + 1 ? <Check size={16} /> : idx + 1}
            </div>
            <span className={`step-label ${step === idx + 1 ? 'active' : ''}`}>{label}</span>
          </div>
        ))}
      </div>
      {renderStep()}
    </div>
  );
};

export default OrderCreation;