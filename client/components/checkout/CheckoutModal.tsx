import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  CreditCard,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Receipt,
  CheckCircle,
  AlertCircle,
  Crown,
  Gift,
  Star,
  Utensils,
  Car,
  Building,
  Wallet,
  Shield,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  X,
  ShoppingCart,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  cookTime: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: { [key: string]: number };
  menuItems: MenuItem[];
  onUpdateCart: (itemId: string, quantity: number) => void;
  onRemoveFromCart: (itemId: string) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  menuItems,
  onUpdateCart,
  onRemoveFromCart,
}) => {
  const [step, setStep] = useState<
    "cart" | "details" | "payment" | "confirmation"
  >("cart");
  const [orderType, setOrderType] = useState<"dine-in" | "room-service">(
    "dine-in",
  );
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roomNumber: "",
    specialRequests: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "room-charge" | "cash"
  >("card");
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardName: "",
  });
  const [loyaltyPoints, setLoyaltyPoints] = useState(1250);
  const [usePoints, setUsePoints] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [tipPercentage, setTipPercentage] = useState<number>(18);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState("25-30 minutes");
  const [orderNumber, setOrderNumber] = useState("");

  const getCartItems = () => {
    return Object.entries(cart).map(([itemId, quantity]) => {
      const item = menuItems.find((i) => i.id === itemId);
      return { item, quantity };
    });
  };

  const getSubtotal = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find((i) => i.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.08; // 8% tax
  };

  const getServiceFee = () => {
    return orderType === "room-service" ? 5 : 0;
  };

  const getPointsDiscount = () => {
    if (!usePoints) return 0;
    const maxDiscount = Math.min(loyaltyPoints / 100, getSubtotal() * 0.2); // 1 point = $0.01, max 20% discount
    return maxDiscount;
  };

  const getFinalTotal = () => {
    return (
      getSubtotal() +
      getTax() +
      getServiceFee() +
      tipAmount -
      getPointsDiscount()
    );
  };

  const calculateTip = (percentage: number) => {
    const tipAmount = (getSubtotal() + getTax() + getServiceFee()) * (percentage / 100);
    setTipAmount(tipAmount);
    setTipPercentage(percentage);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    
    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // Generate order number
    const orderNum = `SH${Date.now().toString().slice(-6)}`;
    setOrderNumber(orderNum);
    setOrderConfirmed(true);
    setIsProcessing(false);
    setStep("confirmation");
  };

  const resetModal = () => {
    setStep("cart");
    setOrderConfirmed(false);
    setIsProcessing(false);
    setCustomerInfo({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      roomNumber: "",
      specialRequests: "",
    });
    setPaymentDetails({
      cardNumber: "",
      expiryDate: "",
      cvv: "",
      cardName: "",
    });
    setUsePoints(false);
    setTipAmount(0);
    setTipPercentage(18);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderCartStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Order</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={orderType === "dine-in" ? "default" : "outline"}
            size="sm"
            onClick={() => setOrderType("dine-in")}
            className={
              orderType === "dine-in" ? "bg-sheraton-gold text-sheraton-navy" : ""
            }
          >
            <Utensils className="h-4 w-4 mr-2" />
            Dine In
          </Button>
          <Button
            variant={orderType === "room-service" ? "default" : "outline"}
            size="sm"
            onClick={() => setOrderType("room-service")}
            className={
              orderType === "room-service"
                ? "bg-sheraton-gold text-sheraton-navy"
                : ""
            }
          >
            <Building className="h-4 w-4 mr-2" />
            Room Service
          </Button>
        </div>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto">
        {getCartItems().map(({ item, quantity }) => {
          if (!item) return null;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.image}</span>
                <div>
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">${item.price} each</p>
                  <p className="text-xs text-gray-500">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {item.cookTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateCart(item.id, quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdateCart(item.id, quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveFromCart(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${getSubtotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (8%)</span>
          <span>${getTax().toFixed(2)}</span>
        </div>
        {orderType === "room-service" && (
          <div className="flex justify-between">
            <span>Service Fee</span>
            <span>${getServiceFee().toFixed(2)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>${(getSubtotal() + getTax() + getServiceFee()).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Continue Shopping
        </Button>
        <Button
          onClick={() => setStep("details")}
          className="flex-1 bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy"
        >
          Proceed to Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Order Details</h3>
        <Badge className="bg-sheraton-gold text-sheraton-navy">
          {orderType === "dine-in" ? "Dine In" : "Room Service"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">First Name *</label>
          <Input
            value={customerInfo.firstName}
            onChange={(e) =>
              setCustomerInfo((prev) => ({
                ...prev,
                firstName: e.target.value,
              }))
            }
            placeholder="Enter first name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Last Name *</label>
          <Input
            value={customerInfo.lastName}
            onChange={(e) =>
              setCustomerInfo((prev) => ({ ...prev, lastName: e.target.value }))
            }
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Email *</label>
        <Input
          type="email"
          value={customerInfo.email}
          onChange={(e) =>
            setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="Enter email for receipt"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Phone Number *</label>
        <Input
          type="tel"
          value={customerInfo.phone}
          onChange={(e) =>
            setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="Enter phone number"
        />
      </div>

      {orderType === "room-service" && (
        <div>
          <label className="block text-sm font-medium mb-2">Room Number *</label>
          <Input
            value={customerInfo.roomNumber}
            onChange={(e) =>
              setCustomerInfo((prev) => ({
                ...prev,
                roomNumber: e.target.value,
              }))
            }
            placeholder="Enter room number"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          Special Requests (Optional)
        </label>
        <Textarea
          value={customerInfo.specialRequests}
          onChange={(e) =>
            setCustomerInfo((prev) => ({
              ...prev,
              specialRequests: e.target.value,
            }))
          }
          placeholder="Any allergies, dietary restrictions, or special instructions..."
          className="min-h-[80px]"
        />
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setStep("cart")}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Button>
        <Button
          onClick={() => setStep("payment")}
          className="flex-1 bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy"
          disabled={
            !customerInfo.firstName ||
            !customerInfo.lastName ||
            !customerInfo.email ||
            !customerInfo.phone ||
            (orderType === "room-service" && !customerInfo.roomNumber)
          }
        >
          Continue to Payment
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Payment & Final Details</h3>

      {/* Loyalty Points */}
      <div className="bg-sheraton-cream rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-sheraton-gold" />
            <span className="font-medium">Loyalty Points</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Use points</span>
            <Switch checked={usePoints} onCheckedChange={setUsePoints} />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Available: {loyaltyPoints.toLocaleString()} points</span>
          {usePoints && (
            <span className="text-green-600 font-medium">
              -${getPointsDiscount().toFixed(2)}
            </span>
          )}
        </div>
        {usePoints && (
          <p className="text-xs text-gray-600 mt-1">
            Using {Math.floor(getPointsDiscount() * 100)} points for discount
          </p>
        )}
      </div>

      {/* Tip Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Add Tip (Optional)</label>
        <div className="grid grid-cols-4 gap-2">
          {[15, 18, 20, 25].map((percentage) => (
            <Button
              key={percentage}
              variant={tipPercentage === percentage ? "default" : "outline"}
              size="sm"
              onClick={() => calculateTip(percentage)}
              className={
                tipPercentage === percentage
                  ? "bg-sheraton-gold text-sheraton-navy"
                  : ""
              }
            >
              {percentage}%
            </Button>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm">Custom:</span>
          <Input
            type="number"
            value={tipAmount.toFixed(2)}
            onChange={(e) => {
              const amount = parseFloat(e.target.value) || 0;
              setTipAmount(amount);
              setTipPercentage(0);
            }}
            className="w-20"
            step="0.01"
            min="0"
          />
          <span className="text-sm">$</span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">Payment Method</label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={paymentMethod === "card" ? "default" : "outline"}
            onClick={() => setPaymentMethod("card")}
            className={
              paymentMethod === "card"
                ? "bg-sheraton-gold text-sheraton-navy"
                : ""
            }
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Card
          </Button>
          <Button
            variant={paymentMethod === "room-charge" ? "default" : "outline"}
            onClick={() => setPaymentMethod("room-charge")}
            className={
              paymentMethod === "room-charge"
                ? "bg-sheraton-gold text-sheraton-navy"
                : ""
            }
          >
            <Building className="h-4 w-4 mr-2" />
            Room
          </Button>
          <Button
            variant={paymentMethod === "cash" ? "default" : "outline"}
            onClick={() => setPaymentMethod("cash")}
            className={
              paymentMethod === "cash"
                ? "bg-sheraton-gold text-sheraton-navy"
                : ""
            }
          >
            <Wallet className="h-4 w-4 mr-2" />
            Cash
          </Button>
        </div>
      </div>

      {/* Payment Details */}
      {paymentMethod === "card" && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-2">
              Cardholder Name
            </label>
            <Input
              value={paymentDetails.cardName}
              onChange={(e) =>
                setPaymentDetails((prev) => ({
                  ...prev,
                  cardName: e.target.value,
                }))
              }
              placeholder="Name on card"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Card Number</label>
            <Input
              value={paymentDetails.cardNumber}
              onChange={(e) =>
                setPaymentDetails((prev) => ({
                  ...prev,
                  cardNumber: e.target.value,
                }))
              }
              placeholder="1234 5678 9012 3456"
              maxLength={19}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Expiry Date
              </label>
              <Input
                value={paymentDetails.expiryDate}
                onChange={(e) =>
                  setPaymentDetails((prev) => ({
                    ...prev,
                    expiryDate: e.target.value,
                  }))
                }
                placeholder="MM/YY"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CVV</label>
              <Input
                value={paymentDetails.cvv}
                onChange={(e) =>
                  setPaymentDetails((prev) => ({
                    ...prev,
                    cvv: e.target.value,
                  }))
                }
                placeholder="123"
                maxLength={3}
              />
            </div>
          </div>
        </div>
      )}

      {paymentMethod === "room-charge" && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">
              Charge to Room {customerInfo.roomNumber}
            </span>
          </div>
          <p className="text-sm text-blue-700">
            This order will be added to your room bill. You can pay at checkout.
          </p>
        </div>
      )}

      {paymentMethod === "cash" && (
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Wallet className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-900">Cash Payment</span>
          </div>
          <p className="text-sm text-green-700">
            Please have exact change ready when your order arrives.
          </p>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-medium mb-3">Order Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${getSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${getTax().toFixed(2)}</span>
          </div>
          {getServiceFee() > 0 && (
            <div className="flex justify-between">
              <span>Service Fee</span>
              <span>${getServiceFee().toFixed(2)}</span>
            </div>
          )}
          {tipAmount > 0 && (
            <div className="flex justify-between">
              <span>Tip</span>
              <span>${tipAmount.toFixed(2)}</span>
            </div>
          )}
          {usePoints && getPointsDiscount() > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Points Discount</span>
              <span>-${getPointsDiscount().toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${getFinalTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          variant="outline"
          onClick={() => setStep("details")}
          className="flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={handlePlaceOrder}
          disabled={isProcessing}
          className="flex-1 bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy"
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              Place Order ${getFinalTotal().toFixed(2)}
              <Receipt className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-sheraton-navy mb-2">
          Order Confirmed!
        </h3>
        <p className="text-gray-600">
          Thank you for your order. We're preparing your delicious meal.
        </p>
      </div>

      <div className="bg-sheraton-cream rounded-lg p-4">
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600">Order Number</div>
          <div className="text-2xl font-bold text-sheraton-navy">
            {orderNumber}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Estimated Time</div>
            <div className="font-medium">{estimatedTime}</div>
          </div>
          <div>
            <div className="text-gray-600">Total Paid</div>
            <div className="font-medium">${getFinalTotal().toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>You'll receive updates via SMS and email</span>
        </div>
        {orderType === "room-service" && (
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>Delivering to Room {customerInfo.roomNumber}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <Button variant="outline" onClick={handleClose} className="flex-1">
          Order More
        </Button>
        <Button
          onClick={handleClose}
          className="flex-1 bg-sheraton-gold hover:bg-sheraton-gold/90 text-sheraton-navy"
        >
          Done
        </Button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-sheraton-gold" />
            <span>Complete Your Order</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[
            { id: "cart", label: "Cart", icon: ShoppingCart },
            { id: "details", label: "Details", icon: User },
            { id: "payment", label: "Payment", icon: CreditCard },
            { id: "confirmation", label: "Confirm", icon: CheckCircle },
          ].map((stepItem, index) => {
            const isActive = step === stepItem.id;
            const isCompleted =
              (step === "details" && stepItem.id === "cart") ||
              (step === "payment" &&
                ["cart", "details"].includes(stepItem.id)) ||
              (step === "confirmation" &&
                ["cart", "details", "payment"].includes(stepItem.id));

            return (
              <div key={stepItem.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-sheraton-gold text-sheraton-navy"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  <stepItem.icon className="h-4 w-4" />
                </div>
                <span
                  className={`ml-2 text-sm ${
                    isActive ? "font-medium text-sheraton-navy" : "text-gray-500"
                  }`}
                >
                  {stepItem.label}
                </span>
                {index < 3 && (
                  <div
                    className={`w-8 h-0.5 mx-4 ${
                      isCompleted ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Content */}
        {step === "cart" && renderCartStep()}
        {step === "details" && renderDetailsStep()}
        {step === "payment" && renderPaymentStep()}
        {step === "confirmation" && renderConfirmationStep()}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
