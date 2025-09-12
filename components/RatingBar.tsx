import React from 'react';
import { View, Text, Pressable } from 'react-native';

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
	return (
		<View>
			<Text>{label}</Text>
			<View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}>
				{[1,2,3,4,5].map(n => (
					<Pressable key={n} onPress={() => onChange(n)}>
						<Text style={{ fontSize: 28 }}>{n <= value ? '★' : '☆'}</Text>
					</Pressable>
				))}
			</View>
			{Boolean(subRatings?.length) && (
				<View style={{ gap: 12 }}>
					{subRatings.map(sr => (
						<View key={sr.key} style={{ gap: 6 }}>
							<Text>{sr.label}</Text>
							<View style={{ flexDirection: 'row', gap: 6 }}>
								{[1,2,3,4,5].map(n => (
									<Pressable key={n} onPress={() => onChangeSub?.(sr.key, n)}>
										<Text style={{ fontSize: 22 }}>{n <= sr.value ? '●' : '○'}</Text>
									</Pressable>
								))}
							</View>
						</View>
					))}
				</View>
			)}
			{Boolean(tags?.length) && (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
					{tags.map(t => {
						const active = selectedTags.includes(t);
						return (
							<Pressable key={t} onPress={() => onToggleTag?.(t)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: active ? '#111' : '#eee' }}>
								<Text style={{ color: active ? '#fff' : '#111' }}>{t}</Text>
							</Pressable>
						);
					})}
				</View>
			)}
		</View>
	);
}


