import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Users, Trash2, X } from 'lucide-react';
import { createStaff, getStaffList, deleteStaff } from '../../services/api';
import { useAuth } from '../../contexts/authContext';

// Schema for creating new staff members (password is optional since backend generates it)
const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["cashier", "driver", "transit_driver"]),
  route_id: z.string().optional(),
});

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(staffSchema),
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const county = JSON.parse(sessionStorage.getItem('user'))?.county
      const response = await getStaffList(county);
      console.log(response)
      if(response.status === 200) {
        setStaff(response.data.users);
      }
      else {
        setError('Failed to fetch staff list');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const response = await createStaff(data.name, data.email, data.role, data.route_id);
      if (!response.data.success) {
        throw new Error('Failed to create staff member');
      }
      fetchStaff();
      setShowModal(false);
      reset();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (staffId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      try {
        const response = await deleteStaff(staffId);
        if (!response.status === 200) {
          throw new Error('Failed to delete staff member');
        }
        fetchStaff();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage order managers and drivers</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Add Staff
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading staff list...</div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-7 gap-4 font-medium text-gray-500">
              <div className="col-span-2">Name</div>
              <div>Role</div>
              <div>County</div>
              <div>Route</div>
              <div>Driver Type</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {staff.map((member) => (
              <div key={member.user_id} className="p-4 grid grid-cols-7 gap-4 hover:bg-gray-50">
                <div className="col-span-2">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <div className="capitalize">{member.role.replace('_', ' ')}</div>
                <div>{member.county}</div>
                <div>{member.route_id || '-'}</div>
                <div>{member.driver_type || '-'}</div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(member.user_id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Staff Member</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  reset();
                }}
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  {...register('role')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="cashier">Order Manager</option>
                  <option value="driver">County Driver</option>
                  <option value="transit_driver">Transit Driver</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700">Route ID (Transit Drivers Only)</label>
                <input
                  type="text"
                  {...register('route_id')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    reset();
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;