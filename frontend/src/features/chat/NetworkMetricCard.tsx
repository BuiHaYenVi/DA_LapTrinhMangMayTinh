import React from 'react';
import { Eye, Calendar, Thermometer, Activity, Radio, Cpu, CheckCheck } from 'lucide-react';
import type { Attachment } from '../../shared/types/api';

interface NetworkMetricCardProps {
  title?: string;
  description?: string;
  isPropertyCard?: boolean;
  tcpRttMs?: number;
  udpRttMs?: number;
  protocolCodec?: string;
  attachments?: Attachment[];
  timestamp?: string;
  isOutgoing?: boolean;
}

export const NetworkMetricCard: React.FC<NetworkMetricCardProps> = ({
  title: _title,
  description = 'This is a modern townhouse in a quiet neighborhood. It has 3 bedrooms, 2 bathrooms, a spacious kitchen and living room 🏠',
  isPropertyCard = true,
  tcpRttMs = 12,
  udpRttMs = 2,
  protocolCodec = 'RFC 6455',
  attachments: _attachments = [],
  timestamp = '11:19 am',
  isOutgoing = false,
}) => {
  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} my-2.5 max-w-[480px]`}>
      <div className="w-full rounded-[28px] bg-[#111111] dark:bg-[#131D18] text-white p-5 shadow-lg border border-black/10 dark:border-white/10 space-y-3.5">
        {/* Description Header */}
        <p className="text-[14px] text-white leading-relaxed font-medium">
          {description}
        </p>

        {isPropertyCard ? (
          /* 3 White Stat Widgets (Matching Reference Mockup Exactly) */
          <div className="grid grid-cols-3 gap-2.5">
            {/* Widget 1: Daily Visitors */}
            <div className="rounded-[18px] bg-white text-[#0F172A] p-3 flex flex-col justify-between shadow-xs">
              <Eye className="h-4 w-4 text-gray-400 mb-1" />
              <div className="text-[11px] font-semibold text-gray-500">Daily Visitors</div>
              <div className="text-[16px] font-extrabold text-[#0F172A] mt-0.5 tracking-tight">
                2,429
              </div>
            </div>

            {/* Widget 2: Building Age */}
            <div className="rounded-[18px] bg-white text-[#0F172A] p-3 flex flex-col justify-between shadow-xs">
              <Calendar className="h-4 w-4 text-gray-400 mb-1" />
              <div className="text-[11px] font-semibold text-gray-500">Building Age</div>
              <div className="text-[16px] font-extrabold text-[#0F172A] mt-0.5 tracking-tight">
                3Y
              </div>
            </div>

            {/* Widget 3: Temperature */}
            <div className="rounded-[18px] bg-white text-[#0F172A] p-3 flex flex-col justify-between shadow-xs">
              <Thermometer className="h-4 w-4 text-gray-400 mb-1" />
              <div className="text-[11px] font-semibold text-gray-500">Temperature</div>
              <div className="text-[16px] font-extrabold text-[#0F172A] mt-0.5 tracking-tight">
                28°F
              </div>
            </div>
          </div>
        ) : (
          /* Network Telemetry Widgets */
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-[18px] bg-white text-[#0F172A] p-3 flex flex-col justify-between shadow-xs">
              <Activity className="h-4 w-4 text-[#2563EB] mb-1" />
              <div className="text-[11px] font-semibold text-gray-500">TCP RTT</div>
              <div className="text-[16px] font-extrabold text-[#0F172A] font-mono mt-0.5">
                {tcpRttMs}ms
              </div>
            </div>

            <div className="rounded-[18px] bg-white text-[#0F172A] p-3 flex flex-col justify-between shadow-xs">
              <Radio className="h-4 w-4 text-[#10B981] mb-1" />
              <div className="text-[11px] font-semibold text-gray-500">UDP :5001</div>
              <div className="text-[16px] font-extrabold text-[#10B981] font-mono mt-0.5">
                {udpRttMs}ms
              </div>
            </div>

            <div className="rounded-[18px] bg-white text-[#0F172A] p-3 flex flex-col justify-between shadow-xs">
              <Cpu className="h-4 w-4 text-[#0284C7] mb-1" />
              <div className="text-[11px] font-semibold text-gray-500">Codec</div>
              <div className="text-[13px] font-extrabold text-[#0F172A] truncate font-mono mt-0.5">
                {protocolCodec}
              </div>
            </div>
          </div>
        )}

        {/* Photos Section: "Here are the photos:" with 3 photos in a row */}
        <div className="space-y-2 pt-1">
          <div className="text-[12px] font-medium text-gray-300">Here are the photos:</div>
          <div className="grid grid-cols-3 gap-2 rounded-[20px] overflow-hidden">
            <div className="relative aspect-4/3 bg-slate-800 rounded-[14px] overflow-hidden">
              <img
                src="/townhouse/bedroom.jpg"
                alt="Bedroom"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="relative aspect-4/3 bg-slate-800 rounded-[14px] overflow-hidden">
              <img
                src="/townhouse/kitchen.jpg"
                alt="Kitchen"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="relative aspect-4/3 bg-slate-800 rounded-[14px] overflow-hidden group">
              <img
                src="/townhouse/bathroom.jpg"
                alt="Bathroom"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white font-extrabold text-sm backdrop-blur-[0.5px]">
                3+
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamp below card */}
      <div className="flex items-center gap-1.5 mt-1 px-2 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
        <span>{timestamp}</span>
        {isOutgoing && <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />}
      </div>
    </div>
  );
};
