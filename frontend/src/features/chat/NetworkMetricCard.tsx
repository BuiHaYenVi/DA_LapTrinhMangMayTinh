import React from 'react';
import { Activity, Radio, Cpu, CheckCheck } from 'lucide-react';
import type { Attachment } from '../../shared/types/api';

interface NetworkMetricCardProps {
  title?: string;
  description?: string;
  tcpRttMs?: number;
  udpRttMs?: number;
  protocolCodec?: string;
  attachments?: Attachment[];
  timestamp?: string;
  isOutgoing?: boolean;
}

export const NetworkMetricCard: React.FC<NetworkMetricCardProps> = ({
  title = 'CMP180 — Giao thức mạng & Đo lường RTT đa luồng',
  description = 'Hệ thống hỗ trợ đồng thời TCP Socket (:5000), UDP Datagram (:5001), WebSocket RFC 6455 (:8081) và WebRTC Mesh.',
  tcpRttMs = 12,
  udpRttMs = 2,
  protocolCodec = 'RFC 6455',
  attachments = [],
  timestamp = '11:19 am',
  isOutgoing = false,
}) => {
  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} my-2.5 max-w-[480px]`}>
      <div className="w-full rounded-[26px] bg-[#111820] dark:bg-[#131D18] text-white p-4.5 shadow-md border border-black/10 dark:border-white/5 space-y-3.5">
        {/* Title and Description */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
              Live Network Telemetry
            </span>
          </div>
          <h4 className="text-[14.5px] font-bold text-white leading-snug">{title}</h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{description}</p>
        </div>

        {/* 3 Nested Metric Cards (Matching reference property stat widgets) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Stat 1: TCP RTT */}
          <div className="rounded-[16px] bg-white text-[#0F172A] p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <Activity className="h-3.5 w-3.5 text-[#2563EB]" />
            </div>
            <div className="text-[10.5px] font-semibold text-slate-500">TCP / WS</div>
            <div className="text-[15px] font-extrabold text-[#0F172A] mt-0.5 font-mono">
              {tcpRttMs} <span className="text-[10px] font-normal">ms</span>
            </div>
          </div>

          {/* Stat 2: UDP RTT */}
          <div className="rounded-[16px] bg-white text-[#0F172A] p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <Radio className="h-3.5 w-3.5 text-[#10B981]" />
            </div>
            <div className="text-[10.5px] font-semibold text-slate-500">UDP :5001</div>
            <div className="text-[15px] font-extrabold text-[#10B981] mt-0.5 font-mono">
              {udpRttMs} <span className="text-[10px] font-normal">ms</span>
            </div>
          </div>

          {/* Stat 3: Protocol Codec */}
          <div className="rounded-[16px] bg-white text-[#0F172A] p-2.5 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <Cpu className="h-3.5 w-3.5 text-[#0284C7]" />
            </div>
            <div className="text-[10.5px] font-semibold text-slate-500">Codec</div>
            <div className="text-[13.5px] font-extrabold text-[#0F172A] mt-0.5 truncate font-mono">
              {protocolCodec}
            </div>
          </div>
        </div>

        {/* Photos Grid preview if attachments exist */}
        {attachments.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[11.5px] font-bold text-slate-300">Tệp đính kèm / Hình ảnh:</div>
            <div className="grid grid-cols-3 gap-2 rounded-[18px] overflow-hidden">
              {attachments.slice(0, 3).map((att, idx) => (
                <div
                  key={att.id || idx}
                  className="relative aspect-4/3 bg-slate-800 rounded-[12px] overflow-hidden group"
                >
                  {att.contentType?.startsWith('image/') ? (
                    <img
                      src={att.dataUrl || att.url}
                      alt={att.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-800 text-white">
                      <span className="text-[10px] font-mono truncate w-full">{att.filename}</span>
                    </div>
                  )}
                  {idx === 2 && attachments.length > 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-sm">
                      +{attachments.length - 2}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timestamp below card */}
      <div className="flex items-center gap-1.5 mt-1 px-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
        <span>{timestamp}</span>
        {isOutgoing && <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" />}
      </div>
    </div>
  );
};
