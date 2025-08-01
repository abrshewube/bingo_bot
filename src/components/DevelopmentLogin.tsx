import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DevelopmentLoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [telegramId, setTelegramId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
       await login({
        telegramId,
        phoneNumber,
        firstName: 'Web',
        lastName: 'User',
        username: 'webuser'
      });
      navigate('/'); // Redirect to the home page after successful login
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleFormSubmit} className="glass-card p-8 rounded-xl space-y-4">
        <h2 className="text-2xl font-bold text-white mb-4">Development Login</h2>
        <div>
          <label className="block text-white mb-2">
            Telegram ID:
            <input
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-gray-500 focus:bg-gray-900 focus:ring-0 text-white"
            />
          </label>
        </div>
        <div>
          <label className="block text-white mb-2">
            Phone Number:
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-gray-800 border-transparent focus:border-gray-500 focus:bg-gray-900 focus:ring-0 text-white"
            />
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default DevelopmentLoginForm;
