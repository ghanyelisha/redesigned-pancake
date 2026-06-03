"use client";
import { useState } from 'react';

export default function PassengerForm({ onSubmit, initial }: any) {
  const [mobile, setMobile] = useState(initial?.mobile || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [name, setName] = useState(initial?.name || '');
  const [surname, setSurname] = useState(initial?.surname || '');
  const [gender, setGender] = useState(initial?.gender || 'Male');
  const [idType, setIdType] = useState(initial?.idType || 'National ID');
  const [idNumber, setIdNumber] = useState(initial?.idNumber || '');

  const [errors, setErrors] = useState<any>({});

  function validate() {
    const e: any = {};
    if (!mobile.match(/^\+?\d{7,15}$/)) e.mobile = 'Enter a valid mobile number with country code';
    if (!name) e.name = 'Enter name';
    if (!surname) e.surname = 'Enter surname';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e: any) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ mobile, email, name, surname, gender, idType, idNumber });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">CM</span>
          <input value={mobile} onChange={(e)=>setMobile(e.target.value)} placeholder="+237 6..." className="p-2 border rounded" />
        </div>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="p-2 border rounded flex-1" />
      </div>
      <div className="flex gap-2">
        <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="p-2 border rounded flex-1" />
        <input value={surname} onChange={(e)=>setSurname(e.target.value)} placeholder="Surname" className="p-2 border rounded flex-1" />
      </div>
      <div>
        <select value={gender} onChange={(e)=>setGender(e.target.value)} className="p-2 border rounded">
          <option>Male</option>
          <option>Female</option>
        </select>
      </div>
      <div className="p-3 border rounded bg-red-50 text-red-700">Restricted items: flammable goods including fuel, gas bottles, and compressed substances are strictly prohibited on all MyBus services.</div>
      <div>
        <select value={idType} onChange={(e)=>setIdType(e.target.value)} className="p-2 border rounded">
          <option>National ID</option>
          <option>Passport</option>
          <option>Birth Certificate</option>
        </select>
        <input value={idNumber} onChange={(e)=>setIdNumber(e.target.value)} placeholder="ID Number" className="p-2 border rounded ml-2" />
      </div>
      <div className="flex justify-between items-center">
        <div className="text-lg font-bold">Total: FCFA 0.00</div>
        <button type="submit" className="bg-blue-900 text-white px-6 py-2 rounded-full">Continue</button>
      </div>
    </form>
  );
}
