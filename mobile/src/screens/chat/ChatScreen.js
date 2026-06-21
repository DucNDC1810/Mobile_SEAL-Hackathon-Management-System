import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi } from '../../api/endpoints';
import {
  connectSocket, joinChatRoom, leaveChatRoom,
  emitTyping, onMessage, onTyping,
} from '../../services/socketService';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar, avatarInitial }) {
  const time = dayjs(msg.created_at).format('HH:mm');
  return (
    <View style={[styles.bubbleRow, isMine ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {/* Avatar (left side, only for received) */}
      {!isMine && (
        <View style={[styles.msgAvatar, { opacity: showAvatar ? 1 : 0 }]}>
          <Text style={styles.msgAvatarText}>{avatarInitial}</Text>
        </View>
      )}

      <View style={{ maxWidth: '72%' }}>
        <View style={[
          styles.bubble,
          isMine ? styles.bubbleSent : styles.bubbleReceived,
        ]}>
          {msg.content ? (
            <Text style={isMine ? styles.bubbleTextSent : styles.bubbleTextReceived}>
              {msg.content}
            </Text>
          ) : null}
          {/* Attachments */}
          {msg.attachments?.map((a, i) => (
            <View key={i} style={styles.attachment}>
              <Ionicons name="attach-outline" size={14} color={isMine ? '#fff' : colors.text.secondary} />
              <Text style={[styles.attachName, isMine ? { color: 'rgba(255,255,255,0.85)' } : {}]} numberOfLines={1}>
                {a.original_name}
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.msgTime, isMine ? { textAlign: 'right' } : {}]}>{time}</Text>
      </View>

      {/* Spacer for sent side */}
      {isMine && <View style={{ width: 8 }} />}
    </View>
  );
}

// ─── Date separator ────────────────────────────────────────────────────────────
function DateSeparator({ date }) {
  const label = dayjs(date).format('DD/MM/YYYY');
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateLine} />
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
      <View style={styles.msgAvatar}>
        <Ionicons name="ellipsis-horizontal" size={12} color={colors.text.muted} />
      </View>
      <View style={[styles.bubble, styles.bubbleReceived, { paddingVertical: 10, paddingHorizontal: 14 }]}>
        <Text style={styles.bubbleTextReceived}>đang gõ...</Text>
      </View>
    </View>
  );
}

// ─── Main ChatScreen ───────────────────────────────────────────────────────────
export default function ChatScreen({ route, navigation }) {
  const { contestId, roundId, teamId, mentorId, chatName, contestTitle } = route.params;
  const { user } = useAuth();

  const [messages,    setMessages]    = useState([]);
  const [inputText,   setInputText]   = useState('');
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [chatOpen,    setChatOpen]    = useState(true);

  const flatListRef  = useRef(null);
  const typingTimer  = useRef(null);
  const myUserId     = user?._id ?? user?.id;

  // ─── Load messages + socket setup ──────────────────────────────────────────
  useEffect(() => {
    let unsubMsg, unsubTyping;

    const setup = async () => {
      // Load history
      try {
        const res = await chatApi.getMessages(contestId, roundId, teamId, mentorId);
        const data = res.data?.data ?? {};
        const msgs = Array.isArray(data) ? data : (data.messages ?? data.data ?? []);
        setMessages(msgs.reverse()); // API returns newest first, we want oldest first
      } catch (e) {
        console.warn('[Chat] load messages error', e);
      } finally {
        setLoading(false);
      }

      // Check chat open status
      try {
        const statusRes = await chatApi.checkStatus(contestId, roundId);
        setChatOpen(statusRes.data?.data?.isOpen ?? true);
      } catch (_) {}

      // Connect socket
      await connectSocket();
      joinChatRoom({ contestId, roundId, teamId, mentorId });

      // Listen for new messages
      unsubMsg = onMessage((msg) => {
        setMessages(prev => [...prev, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });

      // Listen for typing
      unsubTyping = onTyping(({ userId, isTyping }) => {
        if (userId === myUserId) return;
        setTypingUsers(prev =>
          isTyping
            ? prev.includes(userId) ? prev : [...prev, userId]
            : prev.filter(id => id !== userId)
        );
      });
    };

    setup();

    return () => {
      leaveChatRoom({ contestId, roundId, teamId, mentorId });
      unsubMsg?.();
      unsubTyping?.();
    };
  }, [contestId, roundId, teamId, mentorId]);

  // ─── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText('');
    Keyboard.dismiss();
    try {
      const res = await chatApi.sendMessage(contestId, roundId, teamId, mentorId, text);
      // Socket will broadcast — but also add locally for instant feedback
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.warn('[Chat] send error', e);
      setInputText(text); // restore on error
    } finally {
      setSending(false);
    }
  }, [inputText, sending, contestId, roundId, teamId, mentorId]);

  // ─── Typing emit ───────────────────────────────────────────────────────────
  const handleTyping = (text) => {
    setInputText(text);
    emitTyping({ contestId, roundId, teamId, mentorId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emitTyping({ contestId, roundId, teamId, mentorId, isTyping: false });
    }, 1500);
  };

  // ─── Group messages by date ────────────────────────────────────────────────
  const renderItem = ({ item, index }) => {
    const isMine      = item.sender_id?._id === myUserId || item.sender_id === myUserId;
    const prevMsg     = messages[index - 1];
    const showDate    = !prevMsg || !dayjs(item.created_at).isSame(dayjs(prevMsg.created_at), 'day');
    const prevIsSame  = prevMsg && (prevMsg.sender_id?._id ?? prevMsg.sender_id) === (item.sender_id?._id ?? item.sender_id);
    const avatarInitial = (item.sender_id?.full_name ?? chatName ?? '?').charAt(0).toUpperCase();

    return (
      <>
        {showDate && <DateSeparator date={item.created_at} />}
        <MessageBubble
          msg={item}
          isMine={isMine}
          showAvatar={!prevIsSame || showDate}
          avatarInitial={avatarInitial}
        />
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#111827', colors.bg.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>

        <LinearGradient colors={colors.brand.gradient} style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{(chatName ?? '?').charAt(0).toUpperCase()}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerName} numberOfLines={1}>{chatName ?? 'Chat'}</Text>
          {contestTitle && (
            <Text style={styles.headerSub} numberOfLines={1}>{contestTitle}</Text>
          )}
        </View>

        {!chatOpen && (
          <View style={styles.closedBadge}>
            <Ionicons name="lock-closed" size={12} color={colors.status.error} />
            <Text style={styles.closedText}>Đã đóng</Text>
          </View>
        )}
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={colors.brand.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item, i) => item._id ?? String(i)}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Ionicons name="chatbubble-outline" size={48} color={colors.text.muted} />
                <Text style={styles.emptyMsgText}>Chưa có tin nhắn nào.{'\n'}Hãy bắt đầu cuộc trò chuyện!</Text>
              </View>
            }
            ListFooterComponent={typingUsers.length > 0 ? <TypingIndicator /> : null}
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {chatOpen ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={colors.text.muted}
                value={inputText}
                onChangeText={handleTyping}
                multiline
                maxLength={2000}
                returnKeyType="default"
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.closedBar}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.text.muted} />
              <Text style={styles.closedBarText}>Cuộc trò chuyện đã đóng</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: spacing.md,
    paddingHorizontal: spacing.md, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border.default,
  },
  backBtn: { padding: 4 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerName: { ...typography.body, fontWeight: '700' },
  headerSub:  { ...typography.caption },
  closedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.status.error + '20', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.full,
  },
  closedText: { color: colors.status.error, fontSize: 11, fontWeight: '700' },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  bubbleRowLeft:  { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.brand.secondary + '40',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 6, marginBottom: 2,
  },
  msgAvatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  bubble: {
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleSent: {
    backgroundColor: colors.chat.sent,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.chat.received,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  bubbleTextSent:     { color: colors.chat.sentText, fontSize: 15, lineHeight: 22 },
  bubbleTextReceived: { color: colors.chat.receivedText, fontSize: 15, lineHeight: 22 },
  attachment: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 4, opacity: 0.9,
  },
  attachName: { color: colors.text.secondary, fontSize: 12, flex: 1 },
  msgTime: { ...typography.caption, marginTop: 2, paddingHorizontal: 4 },
  dateSep: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: spacing.md, gap: spacing.sm,
  },
  dateLine:  { flex: 1, height: 1, backgroundColor: colors.border.default },
  dateLabel: { ...typography.caption, paddingHorizontal: 8 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bg.secondary,
    borderTopWidth: 1, borderTopColor: colors.border.default, gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 42, maxHeight: 120,
    backgroundColor: colors.bg.elevated, borderRadius: 21,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    color: colors.text.primary, fontSize: 15,
    borderWidth: 1, borderColor: colors.border.default,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 4, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },
  closedBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 12,
  },
  closedBarText: { color: colors.text.muted, fontSize: 14 },
  emptyMessages: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xxl, gap: 12,
  },
  emptyMsgText: { ...typography.bodySmall, textAlign: 'center', lineHeight: 22, color: colors.text.muted },
});
