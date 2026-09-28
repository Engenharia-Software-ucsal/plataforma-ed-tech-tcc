const { View } = require("react-native");

module.exports = {
	__esModule: true,
	default: {
		View,
		Text: require("react-native").Text,
		ScrollView: require("react-native").ScrollView,
		createAnimatedComponent: (Component) => Component,
	},
	useSharedValue: (initial) => ({ value: initial }),
	useAnimatedStyle: (fn) => fn(),
	withTiming: (value) => value,
	withSpring: (value) => value,
};
