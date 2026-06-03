"use client";
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function PassengerForm({ onSubmit, initial }: any) {
  const [mobile, setMobile] = useState(initial?.mobile || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [name, setName] = useState(initial?.name || '');
  const [surname, setSurname] = useState(initial?.surname || '');
  const [gender, setGender] = useState(initial?.gender || 'Male');
  const [idType, setIdType] = useState(initial?.idType || 'National ID');
  const [idNumber, setIdNumber] = useState(initial?.idNumber || '');
  const [errors, setErrors] = useState<any>({});

  const inputClass = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors bg-white placeholder:text-slate-400";
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1";
  const errorClass = "text-xs text-red-500 mt-1";

  function validate() {
    const e: any = {};
    if (!mobile.match(/^\+?\d{7,15}$/)) e.mobile = 'Enter a valid number';
    if (!name.trim()) e.name = 'Required';
    if (!surname.trim()) e.surname = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e: any) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ mobile, email, name, surname, gender, idType, idNumber });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Contact row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Mobile Number</label>
          <div className="flex">
            <span className="px-3 py-2 text-sm bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-slate-600 font-medium">+237</span>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="6 xx xx xx xx"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-r-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            />
          </div>
          {errors.mobile && <p className={errorClass}>{errors.mobile}</p>}
        </div>
        <div>
          <label className={labelClass}>Email (optional)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
        </div>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className={inputClass} />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>
        <div>
          <label className={labelClass}>Last Name</label>
          <input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Last name" className={inputClass} />
          {errors.surname && <p className={errorClass}>{errors.surname}</p>}
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className={labelClass}>Gender</label>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
          <option>Male</option>
          <option>Female</option>
        </select>
      </div>

      {/* Restricted items notice */}
      <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <span>Restricted: flammable goods, fuel, gas bottles, and compressed substances are strictly prohibited on all MyBus services.</span>
      </div>

      {/* ID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>ID Type</label>
          <select value={idType} onChange={(e) => setIdType(e.target.value)} className={inputClass}>
            <option>National ID</option>
            <option>Passport</option>
            <option>Birth Certificate</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>ID Number</label>
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ID number" className={inputClass} />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
      >
        Continue to Payment
      </button>
    </form>
  );
}
