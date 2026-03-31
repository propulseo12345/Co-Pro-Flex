type RGB = [number, number, number];

export const PDF = {
  margin: { left: 20, right: 20, top: 20, bottom: 25 },
  pageWidth: 210,
  contentWidth: 170,
  colors: {
    primary: [37, 99, 235] as RGB,
    text: [30, 41, 59] as RGB,
    textLight: [100, 116, 139] as RGB,
    success: [34, 197, 94] as RGB,
    danger: [239, 68, 68] as RGB,
    bgSection: [241, 245, 249] as RGB,
    border: [226, 232, 240] as RGB,
  },
  fonts: {
    title: 18,
    subtitle: 14,
    sectionTitle: 11,
    body: 10,
    small: 9,
    tiny: 8,
  },
};
