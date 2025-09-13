import React from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

type Props = {
	value: number;
	onChange: (v: number) => void;
	label?: string;
	subRatings?: { key: string; label: string; value: number }[];
	onChangeSub?: (key: string, v: number) => void;
	tags?: string[];
	selectedTags?: string[];
	onToggleTag?: (t: string) => void;
};

export default function RatingBar({ value, onChange, label = 'Overall', subRatings = [], onChangeSub, tags = [], selectedTags = [], onToggleTag }: Props) {
	const pulse = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		Animated.sequence([
			Animated.timing(pulse, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
			Animated.timing(pulse, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }),
		]).start();
	}, [value]);

	return (
		<View>
			<Text style={styles.heading}>{label}</Text>
			<View style={styles.starsRow}>
				{[1,2,3,4,5].map(n => {
					const isActive = n <= value;
					return (
						<Pressable key={n} onPress={() => onChange(n)} style={styles.starWrap} accessibilityLabel={`${label} ${n} stars`}>
							<Animated.Text style={[styles.star, isActive ? styles.starActive : styles.starInactive, { transform: [{ scale: Animated.add(1, Animated.multiply(pulse, isActive ? 0.06 : 0)) }] }]}>
								{isActive ? '★' : '☆'}
							</Animated.Text>
						</Pressable>
					);
				})}
			</View>
			{Boolean(subRatings?.length) && (
				<View style={styles.subRatingsWrap}>
					{subRatings.map(sr => (
						<View key={sr.key} style={styles.subRatingBlock}>
							<Text style={styles.subHeading}>{sr.label}</Text>
							<View style={styles.dotsRow}>
								{[1,2,3,4,5].map(n => {
									const dotActive = n <= sr.value;
									return (
										<Pressable key={n} onPress={() => onChangeSub?.(sr.key, n)} style={styles.dotWrap} accessibilityLabel={`${sr.label} ${n} of 5`}>
											<Text style={[styles.dot, dotActive ? styles.dotActive : styles.dotInactive]}>{dotActive ? '●' : '○'}</Text>
										</Pressable>
									);
								})}
							</View>
						</View>
					))}
				</View>
			)}
			{Boolean(tags?.length) && (
				<View style={styles.tagsWrap}>
					{tags.map(t => {
						const active = selectedTags.includes(t);
						return (
							<Pressable key={t} onPress={() => onToggleTag?.(t)} style={[styles.tag, active ? styles.tagActive : styles.tagInactive]}>
								<Text style={[styles.tagText, active ? styles.tagTextActive : styles.tagTextInactive]}>{t}</Text>
							</Pressable>
						);
					})}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	heading: { color: Colors.brand.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
	subHeading: { color: Colors.brand.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 4 },
	starsRow: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
	starWrap: { padding: 2 },
	star: { fontSize: 28 },
	starActive: { color: Colors.brand.status.completed },
	starInactive: { color: Colors.brand.textSecondary },
	subRatingsWrap: { gap: 12, marginTop: 8 },
	subRatingBlock: { gap: 6 },
	dotsRow: { flexDirection: 'row', gap: 8 },
	dotWrap: { paddingVertical: 2, paddingHorizontal: 2 },
	dot: { fontSize: 20 },
	dotActive: { color: Colors.brand.accentMagenta },
	dotInactive: { color: Colors.brand.textSecondary },
	tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
	tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
	tagActive: { backgroundColor: Colors.brand.accentMagenta },
	tagInactive: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: Colors.brand.border },
	tagText: { fontSize: 12, fontWeight: '700' },
	tagTextActive: { color: Colors.brand.textOnGradient },
	tagTextInactive: { color: Colors.brand.textSecondary },
});


