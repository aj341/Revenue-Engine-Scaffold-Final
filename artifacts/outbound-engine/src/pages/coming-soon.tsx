import { AppLayout } from "@/components/layout";
import { Hammer } from "lucide-react";
import { motion } from "framer-motion";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <AppLayout title={title}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-primary/10 p-6 rounded-3xl mb-6 border border-primary/20"
        >
          <Hammer className="w-16 h-16 text-primary" />
        </motion.div>
        
        <motion.h1 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-display font-bold text-foreground mb-3"
        >
          Under Construction
        </motion.h1>
        
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg"
        >
          The <strong className="text-foreground">{title}</strong> module is currently being built in Phase 2. Check back soon for updates.
        </motion.p>
      </div>
    </AppLayout>
  );
}
