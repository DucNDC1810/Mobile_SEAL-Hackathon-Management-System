import React, { useEffect, useState, useCallback } from 'react';
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

function ConversationItem({ item, onPress, currentUserId }) {
  const otherName = item.team_name ?? item.mentor_name ?? item.name ?? 'Chat';
  const lastMsg   = item.last_message ?? item.lastMessage;
  const unread    = item.unread_count ?? 0;
  const initial   = (otherName).charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.8}>
      {/* Avatar */}
      <LinearGradient
        colors={colors.brand.gradient}
        style={styles.convAvatar}
      >
        <Text style={styles.convAvatarText}>{initial}</Text>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName} numberOfLines={1}>{otherName}</Text>
          {lastMsg && (
            <Text style={styles.convTime}>
              {dayjs(lastMsg.created_at).format('HH:mm')}
            </Text>
          )}
        </View>
        <View style={styles.convBottomRow}>
          <Text style={styles.convLastMsg} numberOfLines={1}>
            {lastMsg?.content || 'Chưa có tin nhắn'}
          </Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
        {item.contest_title && (
          <Text style={styles.convContest} numberOfLines={1}>
            {item.contest_title}
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
      if (isMentor || hasRole('mentor')) {
        // Mentor: get all conversations
        const res = await chatApi.getConversations();
        const raw = res.data?.data ?? [];
        // Each item: { team_id, team_name, contest_id, round_id, mentor_id, last_message }
        setConversations(raw.map(c => ({
          ...c,
          name:         c.team_name ?? c.team_id?.team_name,
          team_name:    c.team_name ?? c.team_id?.team_name,
          contest_title: c.contest_id?.title ?? '',
          _teamId:      c.team_id?._id ?? c.team_id,
          _contestId:   c.contest_id?._id ?? c.contest_id,
          _roundId:     c.round_id?._id ?? c.round_id,
          _mentorId:    c.mentor_id?._id ?? c.mentor_id,
        })));
      } else {
        // Student: get teams via /teams/me, pick team in open contest
        const { teamApi } = await import('../../api/endpoints');
        const myTeamsRes = await teamApi.getMyTeams();
        const myTeams = myTeamsRes.data ?? [];
        if (!myTeams.length) { setConversations([]); return; }

        const sorted = [...myTeams].sort((a, b) => {
          const aOpen = a.contest_id?.status === 'open' ? 1 : 0;
          const bOpen = b.contest_id?.status === 'open' ? 1 : 0;
          return bOpen - aOpen;
        });
        const team = sorted[0];
        const contestTitle = team.contest_id?.title ?? '';

        const mRes = await chatApi.getTeamMentors(team._id);
        const mentors = mRes.data?.data ?? [];
        setConversations(mentors.map(m => ({
          _id:           `${m.contest_id}:${m.round_id}:${team._id}:${m.mentor_id}`,
          name:          m.mentor_name ?? m.full_name ?? 'Mentor',
          mentor_name:   m.mentor_name ?? m.full_name,
          contest_title: contestTitle,
          last_message:  m.last_message,
          _teamId:       team._id,
          _contestId:    m.contest_id,
          _roundId:      m.round_id,
          _mentorId:     m.mentor_id,
        })));
      }
    } catch (e) {
      console.warn('[Conversations] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMentor, hasRole]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
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
              onPress={() => navigation.navigate('Chat', {
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
  },
  convAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  convAvatarText: { color: '#fff', fontWeight: '700', fontSize: 20 },
  convTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName:      { ...typography.body, fontWeight: '700', flex: 1, marginRight: 8 },
  convTime:      { ...typography.caption },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convLastMsg:   { ...typography.bodySmall, flex: 1, marginRight: 8 },
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
