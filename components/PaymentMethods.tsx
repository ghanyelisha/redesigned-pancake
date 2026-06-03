"use client";
import { useState } from 'react';

export default function PaymentMethods({ onSelect }: any) {
  const [method, setMethod] = useState('MoMo');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4">
        <div onClick={()=>{setMethod('MoMo'); onSelect('MoMo');}} className={`p-4 border rounded text-center ${method==='MoMo'?'ring-2 ring-blue-900':''}`}>
          <div className="font-bold text-yellow-500">MoMo</div>
          <div>MTN Mobile Money</div>
        </div>
        <div onClick={()=>{setMethod('USSD'); onSelect('USSD');}} className={`p-4 border rounded text-center ${method==='USSD'?'ring-2 ring-blue-900':''}`}>
          <div className="font-bold text-orange-500">USSD Push</div>
          <div>Orange Money</div>
        </div>
        <div onClick={()=>{setMethod('Web'); onSelect('Web');}} className={`p-4 border rounded text-center ${method==='Web'?'ring-2 ring-blue-900':''}`}>
          <div className="font-bold text-orange-500">Web Payment</div>
          <div>Orange Money</div>
        </div>
      </div>
    </div>
  );
}
