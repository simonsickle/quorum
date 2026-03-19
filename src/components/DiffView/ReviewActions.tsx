interface ReviewActionsProps {
  findingId: string;
  userAction?: 'agree' | 'disagree' | null;
  onAgree: (findingId: string) => void;
  onDisagree: (findingId: string) => void;
  onChat: (findingId: string) => void;
}

export function ReviewActions({
  findingId,
  userAction,
  onAgree,
  onDisagree,
  onChat,
}: ReviewActionsProps) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={() => onAgree(findingId)}
        disabled={userAction === 'agree'}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors
          ${userAction === 'agree'
            ? 'bg-green-800/50 text-green-300 cursor-default'
            : 'bg-green-900/30 text-green-400 hover:bg-green-800/50 border border-green-700/50'
          }`}
      >
        {userAction === 'agree' ? 'Agreed' : 'Agree'}
      </button>

      <button
        onClick={() => onDisagree(findingId)}
        disabled={userAction === 'disagree'}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors
          ${userAction === 'disagree'
            ? 'bg-red-800/50 text-red-300 cursor-default line-through'
            : 'bg-red-900/30 text-red-400 hover:bg-red-800/50 border border-red-700/50'
          }`}
      >
        {userAction === 'disagree' ? 'Dismissed' : 'Disagree'}
      </button>

      <button
        onClick={() => onChat(findingId)}
        className="px-3 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 border border-blue-700/50 transition-colors"
      >
        Chat
      </button>
    </div>
  );
}
