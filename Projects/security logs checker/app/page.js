"use client";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Cpu, Eye, Zap } from "lucide-react";
import { Vortex } from "@/components/ui/vortex";
import { motion } from "framer-motion";

const features = [
  {
    Icon: Eye,
    title: "Threat Detection",
    desc: "Automatically detect MITRE ATT&CK techniques and suspicious patterns in your logs.",
  },
  {
    Icon: Cpu,
    title: "AI-Powered Analysis",
    desc: "Generate incident reports and shift briefings using OpenAI or Gemini.",
  },
  {
    Icon: Zap,
    title: "Instant Insights",
    desc: "Upload any CSV or JSON log file and get a full threat assessment in seconds.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="w-full h-screen overflow-hidden bg-[#000000]">
      <Vortex
        backgroundColor="#000000"
        rangeY={600}
        particleCount={600}
        baseHue={240}
        rangeSpeed={1.1}
        containerClassName="w-full h-full"
        className="flex flex-col items-center justify-center w-full h-full px-4 md:px-16"
      >
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-[#4F8EF7]/30 bg-[#4F8EF7]/5 backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-[#9B6DFF] animate-pulse" />
          <span className="text-[#8BB4FF] text-xs font-mono tracking-widest uppercase">
            AI Security Operations Platform
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-none">
            SENTINEL{" "}
            <span
              className="text-[#4F8EF7]"
              style={{
                textShadow:
                  "0 0 40px rgba(79,142,247,0.7), 0 0 80px rgba(155,109,255,0.4)",
              }}
            >
              SOC
            </span>
          </h1>
          <p className="mt-4 text-[#8090B8] text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            Drop your security logs. Let AI find the threats, map the attacks,
            and brief your team — instantly.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-16"
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="group flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white cursor-pointer transition-all duration-200"
            style={{
              background:
                "linear-gradient(135deg, #4F8EF7 0%, #9B6DFF 100%)",
              boxShadow:
                "0 0 32px rgba(79,142,247,0.45), 0 0 64px rgba(155,109,255,0.2)",
            }}
          >
            <Shield size={18} />
            Analyze Logs
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform duration-200"
            />
          </button>
          <button
            onClick={() => router.push("/dashboard?sample=1")}
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-medium text-[#8090B8] border border-[#4F8EF7]/20 hover:border-[#9B6DFF]/50 hover:text-white bg-[#08091C]/60 backdrop-blur-sm transition-all duration-200 cursor-pointer"
          >
            Test with Sample Data
          </button>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full"
        >
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-3 p-5 rounded-2xl border border-[#4F8EF7]/12 bg-[#08091C]/55 backdrop-blur-md"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(79,142,247,0.15) 0%, rgba(155,109,255,0.15) 100%)",
                  border: "1px solid rgba(155,109,255,0.25)",
                }}
              >
                <Icon size={16} className="text-[#9B6DFF]" />
              </div>
              <div>
                <div className="text-white text-sm font-semibold mb-1">
                  {title}
                </div>
                <div className="text-[#8090B8] text-xs leading-relaxed">
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-6 text-[#2E3560] text-xs font-mono"
        >
          No data leaves your machine · Runs locally · Powered by OpenAI / Gemini
        </motion.p>
      </Vortex>
    </div>
  );
}
