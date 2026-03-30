'use client';

import { useMessagerie } from '@/features/communication/messagerie/hooks';
import { ConversationList, ChatPanel } from '@/features/communication/messagerie/components';
import styles from './messagerie.module.css';

export default function MessageriePage() {
  const {
    conversations,
    activeConversation,
    messages,
    searchTerm,
    filter,
    totalUnread,
    currentUserId,
    selectConversation,
    setSearchTerm,
    setFilter,
    sendMessage,
  } = useMessagerie();

  return (
    <div className={styles.layout}>
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversation?.id ?? null}
        searchTerm={searchTerm}
        filter={filter}
        totalUnread={totalUnread}
        onSelectConversation={selectConversation}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilter}
      />
      <ChatPanel
        conversation={activeConversation}
        messages={messages}
        currentUserId={currentUserId}
        onSendMessage={sendMessage}
      />
    </div>
  );
}
