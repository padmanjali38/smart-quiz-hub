import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const QRCodeDisplay = ({ value, size = 200 }: QRCodeDisplayProps) => {
  return (
    <div className="p-4 bg-white rounded-xl shadow-lg">
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin
        bgColor="#ffffff"
        fgColor="#16a34a"
      />
    </div>
  );
};

export default QRCodeDisplay;
