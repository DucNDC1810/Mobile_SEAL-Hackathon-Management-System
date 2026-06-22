import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { contestApi, teamApi } from '../../api/endpoints';
import { colors, spacing, radius, typography } from '../../theme';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('vi');

// ─── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    if (!targetDate) return;
    const calc = () => {
      const diff = dayjs(targetDate).diff(dayjs());
      if (diff <= 0) { setTimeLeft({ expired: true }); return; }
      const d = dayjs.duration(diff);
      setTimeLeft({
        days:    Math.floor(d.asDays()),
        hours:   d.hours(),
        minutes: d.minutes(),
        seconds: d.seconds(),
      });
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return timeLeft;
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function CountdownBlock({ label, value }) {
  return (
    <View style={styles.countBlock}>
      <Text style={styles.countValue}>{String(value ?? 0).padStart(2, '0')}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }) {
  const map = {
    open:   { label: 'Đang mở',  bg: '#10B98120', text: '#10B981' },
    closed: { label: 'Đã đóng', bg: '#EF444420', text: '#EF4444' },
    draft:  { label: 'Nháp',    bg: '#F59E0B20', text: '#F59E0B' },
  };
  const s = map[status] ?? map.draft;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.text.muted} style={{ marginRight: 8 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function StudentHomeScreen() {
  const { user } = useAuth();
  const [contests,   setContests]   = useState([]);
  const [myTeams,    setMyTeams]    = useState([]);
  const [myTeam,     setMyTeam]     = useState(null);
  const [activeContest, setActiveContest] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const activeRound = activeContest?.rounds?.find(r => r.is_active);
  const deadline    = activeRound?.submission_deadline;
  const countDown   = useCountdown(deadline);

  const fetchData = useCallback(async () => {
    try {
      const [cRes, tRes] = await Promise.allSettled([
        contestApi.getAll(),
        teamApi.getMyTeams(),
      ]);

      // All open contests (for the list section)
      const allContests = cRes.status === 'fulfilled'
        ? (cRes.value.data?.data ?? cRes.value.data ?? [])
        : [];
      const openContests = allContests.filter(c => c.status === 'open');
      setContests(openContests);

      // My teams — /teams/me populates contest_id as object { _id, title, status, ... }
      const rawTeams = tRes.status === 'fulfilled' ? tRes.value.data : [];
      const myTeamList = Array.isArray(rawTeams) ? rawTeams : (rawTeams?.data ?? []);
      setMyTeams(myTeamList);

      // Active contest = first open contest I have a team in
      const myContestIds = new Set(
        myTeamList.map(t => (t.contest_id?._id ?? t.contest_id)?.toString())
      );
      const activeC = openContests.find(c => myContestIds.has(c._id?.toString())) ?? null;
      setActiveContest(activeC);

      if (activeC) {
        const found = myTeamList.find(
          t => (t.contest_id?._id ?? t.contest_id)?.toString() === activeC._id?.toString()
        );
        setMyTeam(found ?? null);
      } else {
        setMyTeam(null);
      }
    } catch (e) {
      console.warn('[StudentHome] fetch error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#111827', colors.bg.primary]}
        style={styles.header}
      >
        <View>
          <Text style={styles.greeting}>Xin chào 👋</Text>
          <Text style={styles.userName}>{user?.full_name ?? 'Thí sinh'}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(user?.full_name ?? 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Contest Card */}
        {activeContest ? (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Cuộc thi đang tham gia</Text>
              <StatusBadge status={activeContest.status} />
            </View>

            <LinearGradient
              colors={['#1E2D45', '#162035']}
              style={styles.contestBanner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="trophy" size={32} color={colors.brand.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.contestTitle}>{activeContest.title}</Text>
              <Text style={styles.contestDesc} numberOfLines={2}>{activeContest.description}</Text>
            </LinearGradient>

            <InfoRow icon="calendar-outline"   label="Bắt đầu"     value={dayjs(activeContest.start_date).format('DD/MM/YYYY')} />
            <InfoRow icon="calendar"           label="Kết thúc"    value={dayjs(activeContest.end_date).format('DD/MM/YYYY')} />
            <InfoRow icon="time-outline"       label="Đăng ký đến" value={dayjs(activeContest.registration_deadline).format('DD/MM/YYYY HH:mm')} />

            {activeRound && (
              <View style={styles.roundBadge}>
                <Ionicons name="layers-outline" size={14} color={colors.brand.accent} />
                <Text style={styles.roundText}>Vòng hiện tại: {activeRound.name}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="trophy-outline" size={48} color={colors.text.muted} />
            <Text style={styles.emptyText}>Chưa có cuộc thi đang mở</Text>
          </View>
        )}

        {/* Countdown */}
        {deadline && !countDown.expired && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>⏰ Thời gian nộp bài</Text>
            <Text style={styles.deadlineLabel}>
              Hạn chót: {dayjs(deadline).format('HH:mm DD/MM/YYYY')}
            </Text>
            <View style={styles.countdownRow}>
              <CountdownBlock label="Ngày"  value={countDown.days} />
              <Text style={styles.colonSep}>:</Text>
              <CountdownBlock label="Giờ"   value={countDown.hours} />
              <Text style={styles.colonSep}>:</Text>
              <CountdownBlock label="Phút"  value={countDown.minutes} />
              <Text style={styles.colonSep}>:</Text>
              <CountdownBlock label="Giây"  value={countDown.seconds} />
            </View>
          </View>
        )}
        {countDown.expired && deadline && (
          <View style={[styles.sectionCard, { borderColor: colors.status.error }]}>
            <Ionicons name="alert-circle" size={24} color={colors.status.error} />
            <Text style={{ color: colors.status.error, fontWeight: '700', marginTop: 8 }}>
              Thời gian nộp bài đã hết!
            </Text>
          </View>
        )}

        {/* Team quick info */}
        {myTeam && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Đội của tôi</Text>
            <View style={styles.teamQuickRow}>
              <View style={styles.teamIconBg}>
                <Ionicons name="people" size={22} color={colors.brand.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{myTeam.team_name}</Text>
                <Text style={styles.teamMeta}>{myTeam.members?.length ?? 0} thành viên</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#7C5CFC20' }]}>
                <Text style={[styles.badgeText, { color: colors.brand.secondary }]}>
                  {myTeam.status}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* All open contests list */}
        {contests.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cuộc thi đang diễn ra</Text>
            {contests.map((c) => {
              const isJoined = myTeams.some(
                t => (t.contest_id?._id ?? t.contest_id)?.toString() === c._id?.toString()
              );
              return (
                <View key={c._id} style={styles.contestListItem}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text style={styles.contestListTitle}>{c.title}</Text>
                      {isJoined && (
                        <View style={[styles.badge, { backgroundColor: '#4F8EF720' }]}>
                          <Text style={[styles.badgeText, { color: '#4F8EF7' }]}>Đang tham gia</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.contestListDate}>
                      {dayjs(c.start_date).format('DD/MM/YYYY')} – {dayjs(c.end_date).format('DD/MM/YYYY')}
                    </Text>
                  </View>
                  <StatusBadge status={c.status} />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg.primary },
  center:      { flex: 1, backgroundColor: colors.bg.primary, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  greeting:    { ...typography.bodySmall, marginBottom: 2 },
  userName:    { ...typography.h2 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.primary + '30',
    borderWidth: 2,
    borderColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.brand.primary, fontWeight: '700', fontSize: 18 },
  scroll:      { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle:{ ...typography.h3, marginBottom: spacing.sm },
  contestBanner: {
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contestTitle: { ...typography.h3, textAlign: 'center', marginBottom: 4 },
  contestDesc:  { ...typography.bodySmall, textAlign: 'center' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: { ...typography.bodySmall, flex: 1 },
  infoValue: { ...typography.body, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  roundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.brand.accent + '15',
    borderRadius: radius.sm,
    padding: 8,
  },
  roundText: { color: colors.brand.accent, fontSize: 13, fontWeight: '600' },
  deadlineLabel: { ...typography.bodySmall, marginBottom: spacing.md, textAlign: 'center' },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  countBlock: {
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 58,
  },
  countValue: { fontSize: 26, fontWeight: '800', color: colors.brand.primary },
  countLabel: { ...typography.caption, marginTop: 2 },
  colonSep:   { fontSize: 24, fontWeight: '800', color: colors.text.muted, marginBottom: 16 },
  teamQuickRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.brand.secondary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  teamName:   { ...typography.body, fontWeight: '700' },
  teamMeta:   { ...typography.bodySmall },
  contestListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: spacing.sm,
  },
  contestListTitle: { ...typography.body, fontWeight: '600' },
  contestListDate:  { ...typography.caption, marginTop: 2 },
  emptyCard: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { ...typography.body, color: colors.text.muted },
});
