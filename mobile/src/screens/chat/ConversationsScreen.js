import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi } from '../../api/endpoints';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';

// Tin nhắn có thể chỉ gồm file đính kèm (content rỗng "") — không được coi là "chưa có tin nhắn".
function previewLastMessage(lastMsg) {
  if (!lastMsg) return 'Chưa có tin nhắn';
  if (lastMsg.content) return lastMsg.content;
  if (lastMsg.attachments?.length) {
    const first = lastMsg.attachments[0];
    const isImage = first.mime_type?.startsWith('image/');
    return isImage ? '📷 Hình ảnh' : `📎 ${first.original_name ?? 'Tệp đính kèm'}`;
  }
  return 'Chưa có tin nhắn';
}

function ConversationItem({ item, onPress }) {
  const otherName = item.mentor_name ?? item.team_name ?? item.name ?? 'Chat';
  const lastMsg   = item.last_message ?? item.lastMessage;
  const unread    = item.unread_count ?? 0;
  const hasUnread = unread > 0;
  const isClosed  = item.chatOpen === false;
  const initial   = (otherName).charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.convItem, hasUnread && styles.convItemUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Unread indicator bar */}
      {hasUnread && <View style={styles.unreadBar} />}

      {/* Avatar */}
      <LinearGradient colors={colors.brand.gradient} style={styles.convAvatar}>
        <Text style={styles.convAvatarText}>{initial}</Text>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <View style={styles.convTopRow}>
          <Text style={[styles.convName, hasUnread && styles.convNameUnread]} numberOfLines={1}>
            {otherName}
          </Text>
          {lastMsg && (
            <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
              {dayjs(lastMsg.created_at).format('HH:mm')}
            </Text>
          )}
        </View>
        <View style={styles.convBottomRow}>
          <Text style={[styles.convLastMsg, hasUnread && styles.convLastMsgUnread]} numberOfLines={1}>
            {previewLastMessage(lastMsg)}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
        {item.contest_title && (
          <Text style={styles.convContest} numberOfLines={1}>
            {item.contest_title}{isClosed ? ' · Đã đóng' : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen({ navigation }) {
  const { user, isStudent, isMentor, hasRole } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      console.log('[Chat] fetchConversations isMentor:', isMentor, 'hasRole(mentor):', hasRole('mentor'), 'user roles:', user?.roles?.map(r => r.role_name));
      if (isMentor || hasRole('mentor')) {
        // Mentor: get all conversations
        const res = await chatApi.getConversations();
        const raw = res.data?.data ?? [];
        // service returns camelCase: teamName, contestTitle, teamId, contestId, roundId, mentorId
        setConversations(raw.map(c => ({
          ...c,
          name:          c.teamName ?? 'Nhóm',
          team_name:     c.teamName ?? 'Nhóm',
          contest_title: c.contestTitle ?? '',
          last_message:  c.lastMessage,
          unread_count:  c.unreadCount ?? 0,
          _teamId:       c.teamId,
          _contestId:    c.contestId,
          _roundId:      c.roundId,
          _mentorId:     c.mentorId,
        })));
      } else {
        // Student: get all teams, then fetch mentors for each team
        console.log('[Chat] student user:', user?._id, user?.email);
        const { teamApi } = await import('../../api/endpoints');
        const myTeamsRes = await teamApi.getMyTeams();
        // /teams/me returns array directly
        const raw = myTeamsRes.data;
        const myTeams = Array.isArray(raw) ? raw : (raw?.data ?? []);
        console.log('[Chat] myTeams count:', myTeams.length, 'ids:', myTeams.map(t => t._id));
        if (!myTeams.length) { setConversations([]); return; }

        // Fetch mentors for all teams in parallel, flatten results
        const allMentors = [];
        await Promise.allSettled(
          myTeams.map(async (team) => {
            try {
              const teamId = team._id?.toString?.() ?? team._id;
              const mRes = await chatApi.getTeamMentors(teamId);
              const mentors = mRes.data?.data ?? [];
              // backend returns camelCase: contestId, roundId, mentorId, mentorName, contestTitle
              mentors.forEach(m => {
                allMentors.push({
                  _id:           `${m.contestId}:${m.roundId}:${teamId}:${m.mentorId}`,
                  name:          m.mentorName ?? 'Mentor',
                  mentor_name:   m.mentorName,
                  contest_title: m.contestTitle ?? '',
                  last_message:  m.lastMessage,
                  unread_count:  m.unreadCount ?? 0,
                  chatOpen:      m.chatOpen,
                  _teamId:       teamId,
                  _contestId:    m.contestId,
                  _roundId:      m.roundId,
                  _mentorId:     m.mentorId,
                });
              });
            } catch (err) {
              console.warn('[Chat] getTeamMentors failed for team', team._id, err?.response?.status, err?.response?.data ?? err?.message);
            }
          })
        );
        // Dedup by _id in case same assignment appears via multiple team entries
        const seen = new Set();
        setConversations(allMentors.filter(m => {
          if (seen.has(m._id)) return false;
          seen.add(m._id);
          return true;
        }));
      }
    } catch (e) {
      console.warn('[Conversations] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMentor, hasRole]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Refresh list every time user navigates back to this tab
  useFocusEffect(useCallback(() => {
    fetchConversations();
  }, [fetchConversations]));

  const onRefresh = () => { setRefreshing(true); fetchConversations(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#111827', colors.bg.primary]} style={styles.header}>
        <Ionicons name="chatbubbles" size={22} color={colors.brand.primary} />
        <Text style={[typography.h2, { flex: 1, marginLeft: 10 }]}>Tin nhắn</Text>
        <Text style={styles.countBadge}>{conversations.length}</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubbles-outline" size={56} color={colors.text.muted} />
            <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện</Text>
            <Text style={styles.emptyDesc}>
              {isMentor || hasRole('mentor')
                ? 'Bạn chưa được phân công nhóm nào'
                : 'Bạn chưa được giao mentor'
              }
            </Text>
          </View>
        ) : (
          conversations.map((c, i) => (
            <ConversationItem
              key={c._id ?? i}
              item={c}
              currentUserId={user?._id}
              onPress={() => navigation.navigate('ChatRoom', {
                contestId: c._contestId,
                roundId:   c._roundId,
                teamId:    c._teamId,
                mentorId:  c._mentorId,
                chatName:  c.name,
                contestTitle: c.contest_title,
              })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header:  {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: spacing.md, paddingHorizontal: spacing.lg,
  },
  countBadge: {
    backgroundColor: colors.brand.primary, color: '#fff',
    fontSize: 12, fontWeight: '700', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: radius.full, overflow: 'hidden',
  },
  scroll: { paddingVertical: spacing.sm },
  convItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border.default, gap: spacing.md,
    position: 'relative', overflow: 'hidden',
  },
  convItemUnread: {
    backgroundColor: colors.brand.primary + '0D',
  },
  unreadBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: colors.brand.primary, borderRadius: 2,
  },
  convAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  convAvatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  convTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName:      { ...typography.body, fontWeight: '600', flex: 1, marginRight: 8 },
  convNameUnread: { fontWeight: '800', color: '#fff' },
  convTime:      { ...typography.caption },
  convTimeUnread: { color: colors.brand.primary, fontWeight: '700' },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convLastMsg:   { ...typography.bodySmall, flex: 1, marginRight: 8 },
  convLastMsgUnread: { color: colors.text.primary, fontWeight: '600' },
  convContest:   { ...typography.caption, color: colors.brand.accent, marginTop: 3 },
  unreadBadge: {
    backgroundColor: colors.brand.primary, minWidth: 20, height: 20,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  unreadText:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  emptyCard: {
    alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: 12,
  },
  emptyTitle: { ...typography.h3, color: colors.text.secondary },
  emptyDesc:  { ...typography.bodySmall, textAlign: 'center', lineHeight: 20 },
});
