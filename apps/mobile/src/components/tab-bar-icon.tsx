import type { ColorValue } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

type TabBarIconProps = {
  color: ColorValue;
  focused: boolean;
  name: "today" | "qibla" | "settings";
  size: number;
};

export function TabBarIcon({ color, focused, name, size }: TabBarIconProps) {
  const strokeWidth = focused ? 2.25 : 1.8;

  return (
    <Svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
    >
      {name === "today" ? (
        <>
          <Circle cx="12" cy="12" fill={focused ? color : "none"} r="3.5" />
          <Line x1="12" x2="12" y1="2" y2="4" />
          <Line x1="12" x2="12" y1="20" y2="22" />
          <Line x1="2" x2="4" y1="12" y2="12" />
          <Line x1="20" x2="22" y1="12" y2="12" />
          <Line x1="4.9" x2="6.3" y1="4.9" y2="6.3" />
          <Line x1="17.7" x2="19.1" y1="17.7" y2="19.1" />
          <Line x1="17.7" x2="19.1" y1="6.3" y2="4.9" />
          <Line x1="4.9" x2="6.3" y1="19.1" y2="17.7" />
        </>
      ) : null}

      {name === "qibla" ? (
        <>
          <Circle cx="12" cy="12" r="9" />
          <Path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z" fill={focused ? color : "none"} />
        </>
      ) : null}

      {name === "settings" ? (
        <>
          <Line x1="4" x2="20" y1="6" y2="6" />
          <Line x1="4" x2="20" y1="12" y2="12" />
          <Line x1="4" x2="20" y1="18" y2="18" />
          <Circle cx="9" cy="6" fill={focused ? color : "#071128"} r="2" />
          <Circle cx="15" cy="12" fill={focused ? color : "#071128"} r="2" />
          <Circle cx="8" cy="18" fill={focused ? color : "#071128"} r="2" />
        </>
      ) : null}
    </Svg>
  );
}
