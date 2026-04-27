import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import CheckoutModal from "../components/checkout/CheckoutModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import {
  Crown,
  QrCode,
  Clock,
  Star,
  Heart,
  Utensils,
  Coffee,
  Wine,
  IceCream,
  Search,
  Filter,
  ShoppingCart,
  Plus,
  Minus,
  Leaf,
  Flame,
  Fish,
  Apple,
  AlertCircle,
  TrendingUp,
  Timer,
  Users,
  ChefHat,
  Globe,
  Zap,
  Bell,
  CheckCircle,
  Gift,
} from "lucide-react";

const MenuPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("food");
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    { id: "all", name: "All Items", icon: Utensils },
    { id: "appetizers", name: "Appetizers", icon: Coffee },
    { id: "mains", name: "Main Courses", icon: ChefHat },
    { id: "desserts", name: "Desserts", icon: IceCream },
    { id: "beverages", name: "Beverages", icon: Wine },
    { id: "special", name: "Special Offers", icon: Crown },
  ];

  const menuItems = [
    {
      id: "truffle-pasta",
      name: "Truffle Mushroom Pasta",
      description:
        "Handmade fettuccine with wild mushrooms, black truffle shavings, and aged parmesan",
      price: 34,
      originalPrice: 42,
      category: "mains",
      image: "🍝",
      cookTime: "15-20 min",
      difficulty: "medium",
      availability: 8,
      maxAvailability: 12,
      dietary: ["vegetarian"],
      spiceLevel: 1,
      popularity: 95,
      origin: "Northern Italy",
      calories: 580,
      description_full:
        "Our signature pasta features locally foraged wild mushrooms, premium black truffle from Périgord, and 24-month aged Parmigiano-Reggiano. The pasta is made fresh daily in our kitchen using traditional Italian techniques.",
      chef_note:
        "Chef Marco's personal favorite - a taste of authentic Italian countryside",
      trending: true,
      special_offer: "Limited time: 20% off",
    },
    {
      id: "wagyu-steak",
      name: "Wagyu Beef Tenderloin",
      description:
        "A5 Wagyu beef with roasted vegetables and red wine reduction",
      price: 89,
      originalPrice: 105,
      category: "mains",
      image: "🥩",
      cookTime: "25-30 min",
      difficulty: "high",
      availability: 4,
      maxAvailability: 6,
      dietary: ["gluten-free"],
      spiceLevel: 2,
      popularity: 88,
      origin: "Japan",
      calories: 650,
      description_full:
        "Premium A5 Wagyu beef sourced directly from certified farms in Japan. Grilled to perfection and served with seasonal roasted vegetables and our signature red wine reduction made with French Bordeaux.",
      chef_note: "Our most exclusive cut - limited daily availability",
      trending: false,
      special_offer: null,
    },
    {
      id: "lobster-bisque",
      name: "Maine Lobster Bisque",
      description: "Creamy lobster soup with fresh herbs and cognac finish",
      price: 18,
      originalPrice: 18,
      category: "appetizers",
      image: "🦞",
      cookTime: "5-8 min",
      difficulty: "low",
      availability: 15,
      maxAvailability: 20,
      dietary: ["gluten-free"],
      spiceLevel: 1,
      popularity: 92,
      origin: "New England, USA",
      calories: 320,
      description_full:
        "Rich and velvety soup made from fresh Maine lobster shells, cream, and aromatic vegetables. Finished with a splash of fine cognac and garnished with fresh chives.",
      chef_note:
        "A classic preparation that highlights the sweet lobster flavor",
      trending: false,
      special_offer: null,
    },
    {
      id: "chocolate-souffle",
      name: "Dark Chocolate Soufflé",
      description:
        "Warm chocolate soufflé with vanilla ice cream and berry coulis",
      price: 16,
      originalPrice: 20,
      category: "desserts",
      image: "🍫",
      cookTime: "20-25 min",
      difficulty: "high",
      availability: 0,
      maxAvailability: 8,
      dietary: ["vegetarian"],
      spiceLevel: 0,
      popularity: 85,
      origin: "France",
      calories: 420,
      description_full:
        "Individual chocolate soufflé made with premium 70% Belgian dark chocolate. Served warm with house-made vanilla bean ice cream and mixed berry coulis.",
      chef_note: "Please allow 25 minutes preparation time - worth the wait!",
      trending: false,
      special_offer: "Today only: 20% off",
    },
    {
      id: "craft-cocktail",
      name: "Sheraton Signature Martini",
      description: "Premium gin with our house-made vermouth and garnishes",
      price: 16,
      originalPrice: 16,
      category: "beverages",
      image: "🍸",
      cookTime: "3-5 min",
      difficulty: "medium",
      availability: 25,
      maxAvailability: 30,
      dietary: ["vegan", "gluten-free"],
      spiceLevel: 0,
      popularity: 78,
      origin: "House Creation",
      calories: 180,
      description_full:
        "Our bartender's signature creation featuring premium botanical gin, house-made dry vermouth infused with local herbs, and finished with our special garnish selection.",
      chef_note: "Each martini is crafted to order with precision and care",
      trending: true,
      special_offer: "Happy Hour: Buy 2 get 1 free",
    },
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (itemId: string) => {
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId]--;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const updateCart = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      });
    } else {
      setCart((prev) => ({ ...prev, [itemId]: quantity }));
    }
  };

  const removeFromCartCompletely = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      delete newCart[itemId];
      return newCart;
    });
  };

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find((i) => i.id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  };

  const getAvailabilityStatus = (item: any) => {
    const percentage = (item.availability / item.maxAvailability) * 100;
    if (percentage === 0)
      return { status: "out", color: "text-red-500", message: "Sold Out" };
    if (percentage < 25)
      return {
        status: "low",
        color: "text-orange-500",
        message: "Almost Gone!",
      };
    if (percentage < 50)
      return { status: "medium", color: "text-yellow-500", message: "Limited" };
    return { status: "good", color: "text-green-500", message: "Available" };
  };

  const getCurrentOffer = () => {
    const hour = currentTime.getHours();
    if (hour >= 11 && hour < 15) {
      return {
        title: "Lunch Special",
        description: "Order now and skip the queue - you come first!",
        emoji: "🍽️",
        countdown: new Date(
          currentTime.getTime() +
            (15 - hour) * 60 * 60 * 1000 -
            currentTime.getMinutes() * 60 * 1000,
        ),
      };
    } else if (hour >= 17 && hour < 23) {
      return {
        title: "Evening Delight",
        description: "Live jazz band + special cocktail prices",
        emoji: "🎷",
        countdown: new Date(
          currentTime.getTime() +
            (23 - hour) * 60 * 60 * 1000 -
            currentTime.getMinutes() * 60 * 1000,
        ),
      };
    }
    return null;
  };

  const currentOffer = getCurrentOffer();

  return (
    <div className="min-h-screen bg-gradient-to-b from-sheraton-cream to-background">
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-sheraton-gold mr-2" />
            <Badge className="bg-sheraton-gold text-sheraton-navy px-4 py-2">
              Digital Menu - Always Fresh
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-sheraton-navy mb-4">
            Sheraton Special Menu
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time availability • Eco-friendly • Skip the queue • Special
            guest priority
          </p>

          {/* Environmental Impact */}
          <div className="flex items-center justify-center gap-2 mt-4 text-sm text-green-600">
            <Leaf className="h-4 w-4" />
            <span>
              You're helping save 12 trees per month by using our digital menu!
            </span>
          </div>
        </div>

        {/* Current Special Offer */}
        {currentOffer && (
          <Card className="mb-8 border-sheraton-gold bg-gradient-to-r from-sheraton-gold/10 to-sheraton-gold/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{currentOffer.emoji}</div>
                  <div>
                    <h3 className="text-xl font-bold text-sheraton-navy">
                      {currentOffer.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {currentOffer.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Ends in:</div>
                  <div className="text-2xl font-bold text-sheraton-gold">
                    {Math.floor(
                      (currentOffer.countdown.getTime() -
                        currentTime.getTime()) /
                        (1000 * 60 * 60),
                    )}
                    h{" "}
                    {Math.floor(
                      ((currentOffer.countdown.getTime() -
                        currentTime.getTime()) %
                        (1000 * 60 * 60)) /
                        (1000 * 60),
                    )}
                    m
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters and Categories */}
          <div className="lg:col-span-1 space-y-6">
            {/* Search */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-sheraton-gold" />
                  Find Your Dish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-sheraton-gold" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? "default" : "ghost"
                    }
                    className={`w-full justify-start gap-2 ${
                      selectedCategory === category.id
                        ? "sheraton-gradient text-white"
                        : ""
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <category.icon className="h-4 w-4" />
                    {category.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Live Kitchen Status */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Zap className="h-5 w-5" />
                  Live Kitchen Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Kitchen Load</span>
                  <span className="text-green-600">Light</span>
                </div>
                <Progress value={35} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  ⚡ Fast service: Orders ready in 15-25 min
                </div>
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>All stations operational</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Menu Items */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-6">
              {filteredItems.map((item) => {
                const availability = getAvailabilityStatus(item);
                const cartQuantity = cart[item.id] || 0;

                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        {/* Item Image and Basic Info */}
                        <div className="flex-1 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="text-5xl">{item.image}</div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-xl font-bold text-sheraton-navy">
                                    {item.name}
                                  </h3>
                                  {item.trending && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-red-100 text-red-600"
                                    >
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      Trending
                                    </Badge>
                                  )}
                                  {item.special_offer && (
                                    <Badge className="bg-sheraton-gold text-sheraton-navy">
                                      <Gift className="h-3 w-3 mr-1" />
                                      Special
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground mb-2">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {item.cookTime}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Globe className="h-4 w-4" />
                                    {item.origin}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Apple className="h-4 w-4" />
                                    {item.calories} cal
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Price and Availability */}
                            <div className="text-right">
                              <div className="flex items-center gap-2 mb-2">
                                {item.originalPrice > item.price && (
                                  <span className="text-sm text-muted-foreground line-through">
                                    ${item.originalPrice}
                                  </span>
                                )}
                                <span className="text-2xl font-bold text-sheraton-navy">
                                  ${item.price}
                                </span>
                              </div>
                              <div
                                className={`text-sm font-medium ${availability.color}`}
                              >
                                {availability.message}
                              </div>
                              {item.availability > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.availability} left
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Detailed Information */}
                          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 mb-2">
                              {item.description_full}
                            </p>
                            {item.chef_note && (
                              <div className="flex items-center gap-2 text-xs text-sheraton-gold">
                                <ChefHat className="h-3 w-3" />
                                <span className="italic">{item.chef_note}</span>
                              </div>
                            )}
                          </div>

                          {/* Tags and Dietary Info */}
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">
                                {item.popularity}% loved
                              </span>
                            </div>
                            {item.dietary.includes("vegetarian") && (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600"
                              >
                                <Leaf className="h-3 w-3 mr-1" />
                                Vegetarian
                              </Badge>
                            )}
                            {item.dietary.includes("gluten-free") && (
                              <Badge
                                variant="outline"
                                className="text-blue-600 border-blue-600"
                              >
                                Gluten-Free
                              </Badge>
                            )}
                            {item.spiceLevel > 0 && (
                              <Badge
                                variant="outline"
                                className="text-red-600 border-red-600"
                              >
                                {Array(item.spiceLevel).fill("🌶️").join("")}
                              </Badge>
                            )}
                          </div>

                          {/* Special Offer */}
                          {item.special_offer && (
                            <div className="mb-4 p-3 bg-sheraton-gold/10 rounded-lg border border-sheraton-gold/30">
                              <div className="flex items-center gap-2 text-sheraton-gold font-medium">
                                <Gift className="h-4 w-4" />
                                <span>{item.special_offer}</span>
                              </div>
                            </div>
                          )}

                          {/* Add to Cart */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {cartQuantity > 0 ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-8 text-center font-medium">
                                    {cartQuantity}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addToCart(item.id)}
                                    disabled={item.availability === 0}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  onClick={() => addToCart(item.id)}
                                  disabled={item.availability === 0}
                                  className="sheraton-gradient text-white"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add to Order
                                </Button>
                              )}
                            </div>

                            {item.availability === 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-sheraton-gold border-sheraton-gold"
                              >
                                <Bell className="h-4 w-4 mr-2" />
                                Notify When Available
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Floating Cart */}
        {getTotalItems() > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Card className="sheraton-gradient text-white border-0 luxury-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    <Badge className="absolute -top-2 -right-2 bg-white text-sheraton-navy min-w-[20px] h-5 p-0 flex items-center justify-center text-xs">
                      {getTotalItems()}
                    </Badge>
                  </div>
                  <div>
                    <div className="font-semibold">${getTotalPrice()}</div>
                    <div className="text-xs text-white/80">
                      {getTotalItems()} items
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white text-sheraton-navy hover:bg-white/90"
                    onClick={() => setShowCheckout(true)}
                  >
                    Order Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR Code Info */}
        <Card className="mt-12 bg-sheraton-navy text-white">
          <CardContent className="p-8 text-center">
            <QrCode className="h-16 w-16 mx-auto mb-4 text-sheraton-gold" />
            <h3 className="text-2xl font-bold mb-4">
              Skip the Wait, Order Like a Boss!
            </h3>
            <p className="text-white/80 mb-6 max-w-2xl mx-auto">
              Scan our table QR codes to instantly access this menu. Order ahead
              and arrive to find your food ready. No more waiting, no more
              explaining dishes to staff - everything is detailed here for you.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <div className="font-semibold">Priority Service</div>
                <div className="text-sm text-white/70">
                  App orders come first
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🌱</div>
                <div className="font-semibold">Eco-Friendly</div>
                <div className="text-sm text-white/70">Zero paper waste</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">👨‍🍳</div>
                <div className="font-semibold">Real-Time Updates</div>
                <div className="text-sm text-white/70">Live availability</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        menuItems={menuItems}
        onUpdateCart={updateCart}
        onRemoveFromCart={removeFromCartCompletely}
      />
    </div>
  );
};

export default MenuPage;
