import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
  ActivityIndicator, Keyboard, Image, Modal, Pressable, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi } from '../../api/endpoints';
import {
  connectSocket, joinChatRoom, leaveChatRoom,
  emitTyping, onMessage, onTyping,
} from '../../services/socketService';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMine, showAvatar, avatarInitial, onPreviewImage }) {
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
          // Bubble ảnh dùng padding mỏng hơn để ảnh sát viền, giống trải nghiệm web
          msg.attachments?.some(a => a.mime_type?.startsWith('image/')) && !msg.content && styles.bubbleImageOnly,
        ]}>
          {msg.content ? (
            <Text style={isMine ? styles.bubbleTextSent : styles.bubbleTextReceived}>
              {msg.content}
            </Text>
          ) : null}
          {/* Attachments */}
          {msg.attachments?.map((a, i) => {
            const isImage = a.mime_type?.startsWith('image/');
            if (isImage) {
              return (
                <TouchableOpacity
                  key={a._id ?? i}
                  onPress={() => onPreviewImage?.(a.url)}
                  activeOpacity={0.9}
                  style={msg.content ? { marginTop: 8 } : null}
                >
                  <Image source={{ uri: a.url }} style={styles.attachImage} resizeMode="cover" />
                </TouchableOpacity>
              );
            }
            return (
              <View key={a._id ?? i} style={styles.attachment}>
                <Ionicons name="attach-outline" size={14} color={isMine ? '#fff' : colors.text.secondary} />
                <Text style={[styles.attachName, isMine ? { color: 'rgba(255,255,255,0.85)' } : {}]} numberOfLines={1}>
                  {a.original_name}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.msgTime, isMine ? { textAlign: 'right' } : {}]}>{time}</Text>
      </View>

      {/* Spacer for sent side */}
      {isMine && <View style={{ width: 8 }} />}
    </View>
  );
}

// ─── Full-screen image preview ──────────────────────────────────────────────────
function ImagePreviewModal({ uri, onClose }) {
  const { width, height } = Dimensions.get('window');
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewBackdrop} onPress={onClose}>
        <TouchableOpacity style={styles.previewCloseBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width, height: height * 0.8 }}
            resizeMode="contain"
          />
        ) : null}
      </Pressable>
    </Modal>
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

  const [messages,      setMessages]      = useState([]);
  const [inputText,     setInputText]     = useState('');
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const [typingUsers,   setTypingUsers]   = useState([]);
  const [chatOpen,      setChatOpen]      = useState(true);
  const [pendingImage,  setPendingImage]  = useState(null); // { uri, name, type } chọn nhưng chưa gửi
  const [previewUri,    setPreviewUri]    = useState(null); // ảnh đang xem full-screen

  const flatListRef  = useRef(null);
  const typingTimer  = useRef(null);
  const inputRef     = useRef(null);
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
        setMessages(msgs); // backend sorts by created_at asc — oldest first is correct
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
        setMessages(prev => {
          if (prev.some(m => m._id && m._id === msg._id)) return prev;
          return [...prev, msg];
        });
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

  // ─── Send message (text và/hoặc ảnh) ────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    const image = pendingImage;
    if (!text && !image) return;
    if (sending) return;
    setSending(true);
    // Clear input via ref (uncontrolled) to avoid iOS autocorrect interference
    inputRef.current?.clear();
    setInputText('');
    setPendingImage(null);
    Keyboard.dismiss();
    try {
      const res = await chatApi.sendMessage(
        contestId, roundId, teamId, mentorId, text,
        image ? [image] : []
      );
      const newMsg = res.data?.data;
      if (newMsg) {
        setMessages(prev => {
          if (prev.some(m => m._id && m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.warn('[Chat] send error', e);
      inputRef.current?.setNativeProps({ text });
      setInputText(text);
      setPendingImage(image);
    } finally {
      setSending(false);
    }
  }, [inputText, pendingImage, sending, contestId, roundId, teamId, mentorId]);

  // ─── Chọn ảnh từ thư viện ───────────────────────────────────────────────────
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return; // người dùng từ chối quyền — im lặng bỏ qua, không chặn luồng chat
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? `photo_${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    setPendingImage({ uri: asset.uri, name, type });
  }, []);

  // ─── Typing emit ───────────────────────────────────────────────────────────
  const handleTyping = useCallback((text) => {
    setInputText(text);
    // Defer typing socket emit to avoid interrupting IME composition (Vietnamese input)
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emitTyping({ contestId, roundId, teamId, mentorId, isTyping: true });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        emitTyping({ contestId, roundId, teamId, mentorId, isTyping: false });
      }, 1500);
    }, 300);
  }, [contestId, roundId, teamId, mentorId]);

  // ─── Group messages by date ────────────────────────────────────────────────
  const renderItem = ({ item, index }) => {
    const senderId    = (item.sender_id?._id ?? item.sender_id)?.toString();
    const isMine      = !!senderId && !!myUserId && senderId === myUserId.toString();
    const prevMsg     = messages[index - 1];
    const showDate    = !prevMsg || !dayjs(item.created_at).isSame(dayjs(prevMsg.created_at), 'day');
    const prevIsSame  = prevMsg && (prevMsg.sender_id?._id ?? prevMsg.sender_id)?.toString() === senderId;
    const avatarInitial = (item.sender_id?.full_name ?? chatName ?? '?').charAt(0).toUpperCase();

    return (
      <>
        {showDate && <DateSeparator date={item.created_at} />}
        <MessageBubble
          msg={item}
          isMine={isMine}
          showAvatar={!prevIsSame || showDate}
          avatarInitial={avatarInitial}
          onPreviewImage={setPreviewUri}
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
            keyExtractor={(item, i) => (item._id ?? item.id ?? String(i)).toString()}
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

        {/* Ảnh đã chọn, chờ gửi */}
        {chatOpen && pendingImage && (
          <View style={styles.pendingImageBar}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingImageThumb} />
            <TouchableOpacity
              style={styles.pendingImageRemove}
              onPress={() => setPendingImage(null)}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={22} color={colors.status.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          {chatOpen ? (
            <>
              <TouchableOpacity style={styles.attachBtn} onPress={pickImage} activeOpacity={0.7}>
                <Ionicons name="image-outline" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor={colors.text.muted}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                returnKeyType="default"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="sentences"
                textContentType="none"
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!inputText.trim() && !pendingImage || sending) && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={(!inputText.trim() && !pendingImage) || sending}
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

      <ImagePreviewModal uri={previewUri} onClose={() => setPreviewUri(null)} />
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
  bubbleImageOnly: { padding: 4 },
  attachImage: {
    width: 220, height: 220, borderRadius: 14,
    backgroundColor: colors.bg.elevated,
  },
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
  attachBtn: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  pendingImageBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
    backgroundColor: colors.bg.secondary,
  },
  pendingImageThumb: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: colors.bg.elevated,
  },
  pendingImageRemove: { marginLeft: -12, marginTop: -36 },
  previewBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute', top: 52, right: spacing.lg, zIndex: 1,
    padding: 8,
  },
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
