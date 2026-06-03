import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, Target, Clock, Sparkle } from "lucide-react";
import { useStore, TodoItem } from "../../lib/store";
import toast from "react-hot-toast";

interface TodoWidgetProps {
  compact?: boolean;
}

export const TodoWidget: React.FC<TodoWidgetProps> = ({ compact = false }) => {
  const { todos, setTodos, activeTodoId, setActiveTodoId, setSubject } = useStore();
  const [inputText, setInputText] = useState("");

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      text: inputText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      studiedMinutes: 0,
    };

    setTodos([newTodo, ...todos]);
    setInputText("");
    toast.success("Focus protocol initialized.");
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map((todo) => {
      if (todo.id === id) {
        // If completed, unlock it as active focus
        if (!todo.completed && activeTodoId === id) {
          setActiveTodoId(null);
        }
        return { ...todo, completed: !todo.completed };
      }
      return todo;
    });
    setTodos(updated);
  };

  const handleDeleteTodo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodos(todos.filter((todo) => todo.id !== id));
    if (activeTodoId === id) {
      setActiveTodoId(null);
    }
    toast.error("Protocol deleted.");
  };

  const handleToggleLockIn = (todo: TodoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (todo.completed) {
      toast.error("Cannot lock into a completed task.");
      return;
    }

    if (activeTodoId === todo.id) {
      setActiveTodoId(null);
      setSubject("General");
      toast.success("Focus target disengaged.");
    } else {
      setActiveTodoId(todo.id);
      setSubject(todo.text);
      toast.success(`Locked into: ${todo.text}`);
    }
  };

  const formatStudiedTime = (minutes: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}m focused`;
    return `${(minutes / 60).toFixed(1)}h focused`;
  };

  return (
    <div className={`glass-card p-6 border-white/5 flex flex-col h-full ${compact ? "bg-transparent border-none p-0" : ""}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
          <Target size={14} className="text-accent" /> Focus Queue
        </h3>
        <span className="text-[10px] font-black bg-white/5 px-2 py-0.5 rounded text-muted">
          {todos.filter((t) => !t.completed).length} Pending
        </span>
      </div>

      {/* Task Input Form */}
      <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Deploy new focus protocol..."
          className="flex-1 bg-black/40 border border-white/10 hover:border-white/20 focus:border-accent/50 focus:ring-0 text-xs px-4 py-2.5 rounded-xl transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="btn-primary p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add Task"
        >
          <Plus size={16} />
        </button>
      </form>

      {/* Task Items List */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1 scrollbar-thin">
        <AnimatePresence initial={false}>
          {todos.map((todo) => {
            const isLocked = activeTodoId === todo.id;
            return (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => handleToggleTodo(todo.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group select-none ${
                  isLocked
                    ? "bg-accent/10 border-accent/40 shadow-[0_0_15px_rgba(var(--accent-rgb),0.05)]"
                    : todo.completed
                    ? "bg-white/2 border-white/2 opacity-50"
                    : "bg-white/5 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Cyber Custom Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      todo.completed
                        ? "bg-success border-success text-black"
                        : isLocked
                        ? "border-accent bg-accent/20 text-accent animate-pulse"
                        : "border-white/20 group-hover:border-white/40"
                    }`}
                  >
                    {todo.completed && <Check size={12} strokeWidth={3} />}
                    {isLocked && !todo.completed && <Sparkle size={10} fill="currentColor" />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-xs font-semibold truncate transition-all ${
                        todo.completed
                          ? "line-through text-muted font-normal"
                          : isLocked
                          ? "text-accent font-bold"
                          : "text-white"
                      }`}
                    >
                      {todo.text}
                    </span>
                    {todo.studiedMinutes > 0 && (
                      <span className="text-[9px] text-muted flex items-center gap-1 mt-0.5">
                        <Clock size={8} /> {formatStudiedTime(todo.studiedMinutes)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Lock In Button */}
                  {!todo.completed && (
                    <button
                      onClick={(e) => handleToggleLockIn(todo, e)}
                      className={`p-1.5 rounded-lg transition-all border ${
                        isLocked
                          ? "bg-accent text-black border-accent hover:bg-accent/90"
                          : "bg-white/5 border-white/5 text-muted hover:text-white hover:border-white/10"
                      }`}
                      title={isLocked ? "Unlock Focus" : "Lock In Focus"}
                    >
                      <Target size={12} />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteTodo(todo.id, e)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-muted hover:text-red-400 hover:border-red-400/20 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete Task"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {todos.length === 0 && (
          <div className="text-center py-8 opacity-30 select-none">
            <Sparkle size={20} className="mx-auto mb-2 text-muted" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">Focus Queue Empty</p>
            <p className="text-[9px] mt-1">Initialize a protocol above.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default TodoWidget;
