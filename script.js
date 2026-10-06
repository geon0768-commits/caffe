// 아래 두 값에 Supabase 프로젝트 URL과 공개용 anon 키를 입력하세요.
const SUPABASE_URL = "https://ecbspibpdmxgetvyusjx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnNwaWJwZG14Z2V0dnl1c2p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMzcxOTYsImV4cCI6MjEwNjgxMzE5Nn0.96JvOFNfUK8uXvQ4DYyLcYpo2BCAqXUR6uYXg0Jmca4";

// 설정값과 CDN이 준비된 경우에만 Supabase 클라이언트를 생성합니다.
const supabaseClient = window.supabase && SUPABASE_URL && SUPABASE_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// 주문서의 각 입력 요소를 HTML에 있는 id와 name으로 가져옵니다.
const orderForm = document.getElementById("order-form");
const customerNameInput = document.getElementById("customer-name");
const phoneInput = document.getElementById("phone");
const drinkSelect = document.getElementById("drink");
const quantityInput = document.getElementById("quantity");
const requestInput = document.getElementById("request");
const estimatedPrice = document.getElementById("estimated-price");
const orderConfirmation = document.getElementById("order-confirmation");
const sizeInputs = document.querySelectorAll('input[name="size"]');
const optionInputs = document.querySelectorAll('input[name="options"]');
const orderTab = document.getElementById("order-tab");
const ordersTab = document.getElementById("orders-tab");
const orderPanel = document.getElementById("order-panel");
const ordersPanel = document.getElementById("orders-panel");
const ordersCount = document.getElementById("orders-count");
const ordersList = document.getElementById("orders-list");
const ordersTotal = document.getElementById("orders-total");
const clearOrdersButton = document.getElementById("clear-orders");
const submitButton = orderForm.querySelector('button[type="submit"]');

// 접수한 주문은 이 배열에 저장하며, 번호는 주문이 추가될 때마다 올라갑니다.
const orders = [];
let nextOrderNumber = 1;
let orderSaving = false;

// data-price 값을 읽어 음료 한 잔의 가격을 수량만큼 계산합니다.
// 음료를 고르지 않았다면 추가 옵션이나 사이즈와 관계없이 0원을 반환합니다.
function calculateTotal() {
  const selectedDrink = drinkSelect.selectedOptions[0];

  if (!selectedDrink || !selectedDrink.value) {
    return 0;
  }

  const drinkPrice = Number(selectedDrink.dataset.price) || 0;
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizePrice = selectedSize ? Number(selectedSize.dataset.price) || 0 : 0;
  let optionPrice = 0;

  // 체크된 추가 옵션의 가격을 모두 더합니다.
  optionInputs.forEach((optionInput) => {
    if (optionInput.checked) {
      optionPrice += Number(optionInput.dataset.price) || 0;
    }
  });

  // 수량이 비어 있거나 숫자가 아니면 기본 수량인 1로 계산합니다.
  const quantity = Number(quantityInput.value) || 1;

  return (drinkPrice + sizePrice + optionPrice) * quantity;
}

// 계산한 금액을 천 단위 쉼표가 있는 한국식 숫자로 표시합니다.
function updateEstimatedPrice() {
  const total = calculateTotal();
  estimatedPrice.textContent = `예상 금액: ${total.toLocaleString("ko-KR")}원`;
}

// 주문 목록과 총액, 탭의 주문 건수를 화면에 다시 그립니다.
function renderOrders() {
  // 이전에 만든 카드를 지우고 현재 배열 내용으로 새로 표시합니다.
  ordersList.replaceChildren();
  ordersCount.textContent = String(orders.length);

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  ordersTotal.textContent = `총 주문 금액: ${totalAmount.toLocaleString("ko-KR")}원 (${orders.length}건)`;

  if (orders.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "orders-empty";
    emptyMessage.textContent = "아직 주문 내역이 없어요 ☕";
    ordersList.append(emptyMessage);
    return;
  }

  // 배열은 새 주문을 앞에 넣으므로 목록에도 최신 주문이 먼저 나옵니다.
  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "order-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "order-card-header";

    const title = document.createElement("h2");
    title.className = "order-card-title";
    title.textContent = `#${order.orderNumber} ${order.name}님 · ${order.amount.toLocaleString("ko-KR")}원`;

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel-order";
    cancelButton.dataset.orderNumber = String(order.orderNumber);
    cancelButton.textContent = "취소";

    cardHeader.append(title, cancelButton);

    const details = document.createElement("p");
    details.className = "order-card-details";
    const optionText = order.options.length > 0
      ? ` (${order.options.join(", ")})`
      : "";
    details.textContent = `${order.drink} ${order.size}사이즈${optionText} ${order.quantity}잔`;

    const meta = document.createElement("p");
    meta.className = "order-card-meta";
    meta.textContent = order.request
      ? `요청사항: ${order.request} · ${order.orderedAt}`
      : order.orderedAt;

    card.append(cardHeader, details, meta);
    ordersList.append(card);
  });
}

// 선택한 탭만 보이게 하고 탭 버튼의 선택 상태도 함께 변경합니다.
function showTab(showOrders) {
  orderPanel.classList.toggle("hidden", showOrders);
  ordersPanel.classList.toggle("hidden", !showOrders);
  orderTab.classList.toggle("active", !showOrders);
  ordersTab.classList.toggle("active", showOrders);
  orderTab.setAttribute("aria-selected", String(!showOrders));
  ordersTab.setAttribute("aria-selected", String(showOrders));
}

orderTab.addEventListener("click", () => showTab(false));
ordersTab.addEventListener("click", () => showTab(true));

// 음료와 사이즈, 옵션이 바뀌면 즉시 예상 금액을 다시 계산합니다.
drinkSelect.addEventListener("change", updateEstimatedPrice);
sizeInputs.forEach((sizeInput) => {
  sizeInput.addEventListener("change", updateEstimatedPrice);
});
optionInputs.forEach((optionInput) => {
  optionInput.addEventListener("change", updateEstimatedPrice);
});
quantityInput.addEventListener("input", updateEstimatedPrice);

// 폼이 제출되면 필수 항목을 확인한 뒤 주문 내용을 안내합니다.
orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // 저장 중에는 마우스 클릭이나 Enter 키로 중복 제출하지 못하게 합니다.
  if (orderSaving) {
    return;
  }

  const customerName = customerNameInput.value.trim();
  if (!customerName) {
    alert("이름을 입력해주세요");
    customerNameInput.focus();
    return;
  }

  if (!drinkSelect.value) {
    alert("음료를 선택해주세요");
    drinkSelect.focus();
    return;
  }

  const selectedDrink = drinkSelect.selectedOptions[0];
  const drinkName = selectedDrink.textContent.replace(/\s[\d,]+원$/, "");
  const drinkPrice = Number(selectedDrink.dataset.price) || 0;
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizeName = selectedSize ? selectedSize.value : "M";
  const quantity = Number(quantityInput.value) || 1;
  const total = calculateTotal();
  const selectedOptions = Array.from(optionInputs)
    .filter((optionInput) => optionInput.checked)
    .map((optionInput) => {
      const optionLabel = document.querySelector(`label[for="${optionInput.id}"]`);
      return optionLabel.textContent.replace(/\s\+\d[\d,]*원$/, "");
    });
  const request = requestInput.value.trim();

  // 테이블의 열 이름에 맞춰 저장할 주문 데이터를 만듭니다.
  const databaseOrder = {
    customer_name: customerName,
    phone: phoneInput.value.trim(),
    drink: drinkName,
    drink_price: drinkPrice,
    size: sizeName,
    options: selectedOptions,
    quantity,
    request,
    total_price: total
  };

  orderSaving = true;
  submitButton.disabled = true;

  try {
    // URL이나 키가 아직 입력되지 않았으면 저장 실패로 처리합니다.
    if (!supabaseClient) {
      throw new Error("Supabase URL과 키를 먼저 설정해야 합니다.");
    }

    // cafe_menu03 테이블에 주문 한 건을 저장합니다.
    const { error } = await supabaseClient
      .from("cafe_menu03")
      .insert(databaseOrder);

    if (error) {
      throw error;
    }

    // 데이터베이스 저장이 성공했을 때만 주문 내역과 확인 메시지를 갱신합니다.
    const order = {
      orderNumber: nextOrderNumber,
      name: customerName,
      drink: drinkName,
      size: sizeName,
      options: selectedOptions,
      quantity,
      request,
      amount: total,
      orderedAt: new Date().toLocaleString("ko-KR")
    };
    nextOrderNumber += 1;
    orders.unshift(order);
    renderOrders();

    // 접수할 때마다 배지 애니메이션을 처음부터 다시 시작합니다.
    ordersCount.classList.remove("badge-pop");
    void ordersCount.offsetWidth;
    ordersCount.classList.add("badge-pop");

    // 추가 옵션이 있을 때만 이름을 괄호 안에 표시합니다.
    const optionText = selectedOptions.length > 0
      ? ` (${selectedOptions.join(", ")})`
      : "";
    const formattedTotal = total.toLocaleString("ko-KR");

    orderConfirmation.textContent = `${customerName}님, ${drinkName} ${sizeName}사이즈${optionText} ${quantity}잔, 총 ${formattedTotal}원 주문이 접수되었습니다!`;
    orderConfirmation.hidden = false;
  } catch (error) {
    // 자세한 오류는 콘솔에서 확인하고 손님에게는 간단한 안내를 보여 줍니다.
    console.error("주문 저장 오류:", error);
    alert("주문 저장에 실패했어요");
  } finally {
    // 저장 성공/실패와 관계없이 버튼을 다시 누를 수 있게 합니다.
    orderSaving = false;
    submitButton.disabled = false;
  }
});

// 취소 버튼을 누르면 확인을 받은 뒤 해당 주문만 배열에서 제거합니다.
ordersList.addEventListener("click", (event) => {
  const cancelButton = event.target.closest(".cancel-order");
  if (!cancelButton) {
    return;
  }

  const orderNumber = Number(cancelButton.dataset.orderNumber);
  const order = orders.find((savedOrder) => savedOrder.orderNumber === orderNumber);

  if (order && confirm(`#${orderNumber} 주문을 취소할까요?`)) {
    const orderIndex = orders.findIndex((savedOrder) => savedOrder.orderNumber === orderNumber);
    orders.splice(orderIndex, 1);
    renderOrders();
  }
});

// 전체 삭제도 확인을 받은 경우에만 주문 배열을 비웁니다.
clearOrdersButton.addEventListener("click", () => {
  if (orders.length > 0 && confirm("주문 내역을 모두 지울까요?")) {
    orders.splice(0, orders.length);
    renderOrders();
  }
});

// 폼의 기본 초기화 동작으로 M 사이즈와 수량 1이 복원된 뒤 금액을 갱신합니다.
orderForm.addEventListener("reset", () => {
  orderConfirmation.hidden = true;
  window.setTimeout(updateEstimatedPrice, 0);
});

// 페이지가 처음 열릴 때도 예상 금액을 올바르게 표시합니다.
updateEstimatedPrice();
renderOrders();