'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import POSPageWrapper from '@/app/components/POSPageWrapper';
import { Monitor, Smartphone, Tablet, Wifi, Copy, Check, Server, ShieldAlert, Link as LinkIcon, AlertTriangle, Globe, Zap } from 'lucide-react';

interface NetworkAddress {
    name: string;
    address: string;
    family: string;
}

export default function DeviceAccessPage() {
    const [addresses, setAddresses] = useState<NetworkAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [port, setPort] = useState('3000');
    const [protocol, setProtocol] = useState('http:');
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const fetchNetworkInfo = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/network-info');
            const json = await res.json();
            if (json.status === 'success') {
                setAddresses(json.data.addresses);
            }
        } catch {
            toast.error('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນເຄືອຂ່າຍ');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPort(window.location.port ? `:${window.location.port}` : ':3000');
            setProtocol(window.location.protocol === 'https:' ? 'https:' : 'http:');
        }
        fetchNetworkInfo();
    }, [fetchNetworkInfo]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedUrl(text);
            toast.success('ຄັດລອກລິ້ງສຳເລັດແລ້ວ');
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch {
            toast.error('ບໍ່ສາມາດຄັດລອກໄດ້');
        }
    };

    const localhostUrl = `${protocol}//localhost${port}/`;

    return (
        <POSPageWrapper title="ການເຂົ້າເຖິງອຸປະກອນອື່ນ (Device Access)" icon={<Monitor size={22} />} onRefresh={fetchNetworkInfo}>
            <div className="max-w-4xl mx-auto space-y-5 pb-12 animate-in fade-in duration-500">

                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1f35] to-[#141824] border border-[#2a3050]/60 p-7">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="relative flex items-start gap-5">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-2xl text-blue-400 flex-shrink-0 mt-0.5">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-100 mb-2">ເຊື່ອມຕໍ່ອຸປະກອນອື່ນເຂົ້າລະບົບ POS</h2>
                            <p className="text-gray-400 text-[14px] leading-[1.7]">
                                ສະແກນ QR Code ດ້ານລຸ່ມດ້ວຍມືຖື ຫຼື ແທັບເລັດ ທີ່ເຊື່ອມຕໍ່{' '}
                                <span className="text-blue-400 font-medium">Wi-Fi ວົງດຽວກັນ</span>{' '}
                                ເພື່ອໃຊ້ງານ POS ຮ່ວມກັນໄດ້ທັນທີ ໂດຍບໍ່ຕ້ອງລົງແອັບເພີ່ມ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Network Address Cards */}
                {!loading && addresses.map((addr, index) => {
                    const number = index + 1;
                    const url = `${protocol}//${addr.address}${port}/`;
                    const isPrimary = index === 0;
                    const isCopied = copiedUrl === url;

                    return (
                        <div
                            key={addr.address}
                            className={`relative rounded-2xl border transition-all duration-300 ${
                                isPrimary
                                    ? 'bg-gradient-to-br from-[#161b2e] to-[#111522] border-blue-500/25 hover:border-blue-500/40'
                                    : 'bg-[#13161f] border-[#222840]/60 hover:border-[#3a4570]/60'
                            }`}
                        >
                            {/* Primary badge */}
                            {isPrimary && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[11px] font-semibold px-3 py-1 rounded-full">
                                    <Zap size={11} />
                                    ແນະນຳ
                                </div>
                            )}

                            <div className="p-6 sm:p-7">
                                {/* Network label */}
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-lg text-[11px] font-semibold tracking-wide ${
                                    isPrimary
                                        ? 'bg-blue-500/10 text-blue-400'
                                        : 'bg-gray-500/10 text-gray-400'
                                }`}>
                                    <Wifi size={12} />
                                    {addr.name}
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-7">
                                    {/* QR Code */}
                                    <div className="flex-shrink-0 flex flex-col items-center">
                                        <div className={`bg-white p-4 rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.03] ${
                                            isPrimary ? 'shadow-blue-500/10' : 'shadow-black/20'
                                        }`}>
                                            <QRCodeSVG value={url} size={140} level="H" fgColor="#1a1f35" />
                                        </div>
                                        <span className={`mt-3 text-[10px] font-bold tracking-[0.15em] uppercase ${
                                            isPrimary ? 'text-blue-400/70' : 'text-gray-500'
                                        }`}>
                                            ສະແກນ QR
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 w-full space-y-4">
                                        <div>
                                            <h3 className="text-[17px] font-bold text-gray-100 mb-1.5">
                                                {number}. ເຂົ້າລະບົບຜ່ານ {isPrimary ? 'ລິ້ງຫຼັກ' : 'ລິ້ງສຳຮອງ'}
                                            </h3>
                                            <p className="text-gray-500 text-[13px] leading-relaxed">
                                                {isPrimary
                                                    ? 'ສະແກນ QR Code ນີ້ ຫຼື ພິມ URL ດ້ານລຸ່ມໃສ່ browser ເພື່ອເຊື່ອມຕໍ່'
                                                    : 'ໃຊ້ລິ້ງນີ້ ຫາກລິ້ງຫຼັກໃຊ້ງານບໍ່ໄດ້'}
                                            </p>
                                        </div>

                                        {/* URL + Copy */}
                                        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                                            <div className="flex-1 bg-[#0c0e15] text-gray-400 font-mono text-[13px] px-4 py-3 rounded-xl border border-[#1e2235] truncate select-all flex items-center">
                                                <Globe size={14} className="mr-2.5 text-gray-600 flex-shrink-0" />
                                                {url}
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(url)}
                                                className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                                                    isCopied
                                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                                        : isPrimary
                                                            ? 'bg-blue-600/90 text-white hover:bg-blue-500 border border-blue-500/50'
                                                            : 'bg-[#1e2235] text-gray-300 hover:bg-[#262b42] border border-[#2a3050]'
                                                }`}
                                            >
                                                {isCopied ? <Check size={15} /> : <Copy size={15} />}
                                                <span>{isCopied ? 'ສຳເລັດ' : 'ຄັດລອກ'}</span>
                                            </button>
                                        </div>

                                        {/* Device types */}
                                        {isPrimary && (
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <span className="text-[11px] text-gray-500 font-medium mr-1">ຮອງຮັບ:</span>
                                                {[
                                                    { icon: Smartphone, label: 'ໂທລະສັບ' },
                                                    { icon: Tablet, label: 'ແທັບເລັດ' },
                                                    { icon: Monitor, label: 'ຄອມພິວເຕີ' },
                                                ].map(({ icon: Icon, label }) => (
                                                    <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-[#1a1e2e] border border-[#252a3e] rounded-lg px-2.5 py-1">
                                                        <Icon size={11} />
                                                        {label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Localhost Section */}
                <div className="rounded-2xl bg-[#111318] border border-[#1e2130]/60 hover:border-[#2a3050]/50 transition-all duration-300">
                    <div className="p-5 px-6 flex flex-col sm:flex-row items-center gap-5">
                        <div className="flex-1 w-full space-y-3">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 rounded-lg bg-gray-500/8 text-[11px] font-semibold text-gray-500 tracking-wide">
                                    <Server size={12} />
                                    LOCALHOST
                                </div>
                                <h3 className="text-[15px] font-semibold text-gray-300 mb-0.5">
                                    ສຳລັບເຄື່ອງນີ້ເທົ່ານັ້ນ
                                </h3>
                                <p className="text-gray-600 text-[12px]">
                                    ລິ້ງນີ້ໃຊ້ໄດ້ສະເພາະຄອມເຄື່ອງນີ້ • ອຸປະກອນອື່ນໃຊ້ບໍ່ໄດ້
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5 max-w-md">
                                <div className="flex-1 bg-[#0c0e15] text-gray-500 font-mono text-[12px] px-3.5 py-2.5 rounded-lg border border-[#1a1d28] truncate">
                                    {localhostUrl}
                                </div>
                                <button
                                    onClick={() => copyToClipboard(localhostUrl)}
                                    className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                                        copiedUrl === localhostUrl
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                            : 'bg-[#1a1e2e] text-gray-400 hover:text-gray-300 hover:bg-[#222740] border border-[#252a3e]'
                                    }`}
                                >
                                    {copiedUrl === localhostUrl ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{copiedUrl === localhostUrl ? 'ແລ້ວ' : 'ຄັດລອກ'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Troubleshooting Tips */}
                <div className="rounded-2xl bg-[#161820] border border-amber-500/15 p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-amber-500/10 p-2.5 rounded-xl flex-shrink-0 mt-0.5">
                            <AlertTriangle size={20} className="text-amber-500/80" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-[14px] font-bold text-amber-400/90">
                                ສະແກນແລ້ວເຂົ້າບໍ່ໄດ້?
                            </h4>
                            <div className="space-y-2">
                                {[
                                    { text: 'ກວດສອບວ່າມືຖື/ແທັບເລັດ ຕໍ່ Wi-Fi ວົງດຽວກັນ (ບໍ່ແມ່ນ 4G/5G)', highlight: 'Wi-Fi ວົງດຽວກັນ' },
                                    { text: 'ລອງປິດ Windows Firewall ຊົ່ວຄາວ', highlight: 'Windows Firewall' },
                                    { text: 'ຫາກ Router ເປີດ AP Isolation ໃຫ້ປິດກ່ອນ', highlight: 'AP Isolation' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-2.5 text-[13px] text-gray-400 leading-relaxed">
                                        <span className="text-amber-500/70 font-bold mt-px flex-shrink-0">{i + 1}.</span>
                                        <span>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </POSPageWrapper>
    );
}
