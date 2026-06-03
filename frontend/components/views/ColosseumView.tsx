import React from "react";
import { motion } from "framer-motion";
import { Plus, Users, Swords } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { unescapeHtml } from "../../lib/utils";

interface ColosseumViewProps {
  rooms: any[];
  currentRoom: any;
  onJoinRoom: (id: string) => void;
  onCreateRoom: () => void;
  isLoading?: boolean;
}

const ColosseumView: React.FC<ColosseumViewProps> = ({ rooms, currentRoom, onJoinRoom, onCreateRoom, isLoading }) => {
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-lg text-4xl">The Colosseum</h2>
          <p className="text-muted font-medium mt-1 uppercase tracking-widest text-[10px]">Live Study Clusters • Synchronized Discipline</p>
        </div>
        <motion.button 
          className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs" 
          onClick={onCreateRoom}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} /> Create Cluster
        </motion.button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-8 space-y-6 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="w-20 h-6 skeleton rounded-full" />
                <div className="w-10 h-4 skeleton" />
              </div>
              <div className="w-3/4 h-6 skeleton rounded-lg" />
              <div className="w-full h-3 skeleton" />
              <div className="w-full h-10 skeleton rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room, idx) => (
            <motion.div 
              key={room._id} 
              className="glass-card p-8 group hover:border-accent/40 transition-all border border-white/5 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
              whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(62,99,221,0.15)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest">
                  {room.activeSubject || "General"}
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Users size={12} />
                  <span className="text-xs font-bold">{room.members?.length || 0}</span>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{unescapeHtml(room.name)}</h3>
              <p className="text-[10px] text-muted mb-8 line-clamp-2 italic uppercase tracking-widest font-black">
                Commanded by {room.ownerId?.name || (typeof room.ownerId === 'string' ? `Agent ${room.ownerId.slice(-4)}` : "Unknown Agent")}
              </p>
              <motion.button 
                className={`btn-secondary w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  currentRoom?._id === room._id ? "bg-success/20 text-success border border-success/40" : ""
                }`}
                onClick={() => onJoinRoom(room._id)}
                whileTap={{ scale: 0.97 }}
              >
                {currentRoom?._id === room._id ? "SYNCHRONIZED" : "JOIN CLUSTER"}
              </motion.button>
            </motion.div>
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Swords}
                title="No Active Clusters"
                description="There are currently no active synchronized study chambers. Initialize a cluster to study in real-time with other agents."
                actionLabel="Create Cluster"
                onActionClick={onCreateRoom}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ColosseumView;

