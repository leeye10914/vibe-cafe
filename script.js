// Supabase 연결 정보를 여기서 설정합니다.
// 직접 넣을 값이기 때문에 빈 문자열로 두고, 나중에 프로젝트 정보를 넣으면 됩니다.
const SUPABASE_URL = 'https://cetxiwlgpfsjlygkgaad.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHhpd2xncGZzamx5Z2tnYWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTI5MDYsImV4cCI6MjEwNjk4ODkwNn0.CNWcQlLuPqC4CKm27HTquzDLAwHv8EoITrt5LMbrTlA';

// Supabase 클라이언트를 생성합니다.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// HTML에서 주문서에 필요한 요소들을 찾아 변수에 담아 둡니다.
const orderForm = document.getElementById('order-form');
const customerNameInput = document.getElementById('customer-name');
const phoneInput = document.getElementById('phone');
const drinkSelect = document.getElementById('drink');
const quantityInput = document.getElementById('quantity');
const requestInput = document.getElementById('request');
const estimatedPrice = document.getElementById('estimated-price');
const orderMessage = document.getElementById('order-message');
const submitButton = document.querySelector('button[type="submit"]');
const sizeInputs = document.querySelectorAll('input[name="size"]');
const optionInputs = document.querySelectorAll('input[name="options"]');

// data-price에 적힌 가격을 읽어 주문 전체 금액을 계산합니다.
function calculateTotal() {
  // 음료를 고르지 않았다면 추가 금액이 있더라도 예상 금액은 0원입니다.
  if (drinkSelect.value === '') {
    return 0;
  }

  // 선택한 음료의 가격을 먼저 가져옵니다.
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
  let oneDrinkPrice = Number(selectedDrink.dataset.price);

  // 선택한 사이즈의 추가 금액을 음료 가격에 더합니다.
  const selectedSize = document.querySelector('input[name="size"]:checked');
  if (selectedSize) {
    oneDrinkPrice += Number(selectedSize.dataset.price);
  }

  // 체크한 추가 옵션의 가격을 하나씩 더합니다.
  optionInputs.forEach((optionInput) => {
    if (optionInput.checked) {
      oneDrinkPrice += Number(optionInput.dataset.price);
    }
  });

  // 수량을 숫자로 읽고, 비어 있거나 올바르지 않은 값은 1로 계산합니다.
  const enteredQuantity = Number(quantityInput.value);
  const quantity = Number.isFinite(enteredQuantity) && enteredQuantity > 0
    ? enteredQuantity
    : 1;

  // 한 잔 가격에 수량을 곱해 전체 주문 금액을 반환합니다.
  return oneDrinkPrice * quantity;
}

// 계산된 금액을 천 단위 콤마와 함께 화면에 표시합니다.
function updateEstimatedPrice() {
  const total = calculateTotal();
  estimatedPrice.textContent = `예상 금액: ${total.toLocaleString()}원`;
}

// 음료가 바뀌면 예상 금액을 다시 계산합니다.
drinkSelect.addEventListener('change', updateEstimatedPrice);

// 사이즈 선택이 바뀌면 예상 금액을 다시 계산합니다.
sizeInputs.forEach((sizeInput) => {
  sizeInput.addEventListener('change', updateEstimatedPrice);
});

// 추가 옵션을 선택하거나 해제하면 예상 금액을 다시 계산합니다.
optionInputs.forEach((optionInput) => {
  optionInput.addEventListener('change', updateEstimatedPrice);
});

// 수량을 입력하는 동안 예상 금액을 실시간으로 다시 계산합니다.
quantityInput.addEventListener('input', updateEstimatedPrice);

// 주문 저장 중에는 버튼을 잠시 막아 두 번 누르지 못하게 합니다.
function setSubmitButtonLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? '주문 저장 중...' : '주문하기';
}

// 주문 저장에 필요한 데이터를 준비하고 Supabase에 넣습니다.
async function saveOrderToSupabase(orderData) {
  // cafe_menu03 테이블에 한 번에 주문 정보를 저장합니다.
  const { data, error } = await supabaseClient
    .from('cafe_menu03')
    .insert([orderData]);

  // 저장이 실패하면 예외를 던져 제출 처리 부분에서 안내하도록 합니다.
  if (error) {
    throw error;
  }

  return data;
}

// 주문서가 제출되면 이름과 음료 선택을 확인한 뒤 주문 결과를 보여줍니다.
orderForm.addEventListener('submit', async (event) => {
  // 페이지가 새로고침되지 않도록 기본 제출 동작을 막습니다.
  event.preventDefault();

  // 이름 앞뒤의 공백은 제거한 뒤 비어 있는지 확인합니다.
  const customerName = customerNameInput.value.trim();
  if (customerName === '') {
    alert('이름을 입력해주세요');
    customerNameInput.focus();
    return;
  }

  // 음료를 선택하지 않았다면 주문을 진행하지 않습니다.
  if (drinkSelect.value === '') {
    alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  // 선택한 사이즈와 수량을 읽습니다.
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizeName = selectedSize ? selectedSize.value : 'M';
  const quantity = Number(quantityInput.value) > 0
    ? Number(quantityInput.value)
    : 1;

  // 선택한 옵션 이름을 배열로 저장합니다.
  const selectedOptions = Array.from(optionInputs)
    .filter((optionInput) => optionInput.checked)
    .map((optionInput) => optionInput.value);

  // option 값은 배열 형태로 DB에 저장할 수 있게 준비합니다.
  // 값이 없으면 빈 배열을 넣어줍니다.
  const total = calculateTotal();
  const selectedDrinkPrice = Number(drinkSelect.options[drinkSelect.selectedIndex].dataset.price);

  // Supabase에 저장할 객체를 구성합니다.
  const orderData = {
    customer_name: customerName,
    phone: phoneInput.value.trim(),
    drink: drinkSelect.value,
    // drink_price에는 선택한 음료 자체의 기본 가격을 저장합니다.
    drink_price: selectedDrinkPrice,
    size: sizeName,
    options: selectedOptions,
    quantity: quantity,
    request: requestInput.value.trim(),
    total_price: total,
  };

  // 중복 주문 방지를 위해 저장 중에는 버튼을 비활성화합니다.
  setSubmitButtonLoading(true);

  try {
    // 주문 정보를 Supabase 데이터베이스에 저장합니다.
    await saveOrderToSupabase(orderData);

    // 저장이 완료되면 기존 주문 확인 메시지를 보여줍니다.
    const optionsText = selectedOptions.length > 0
      ? ` (${selectedOptions.join(', ')})`
      : '';

    orderMessage.textContent =
      `${customerName}님, ${drinkSelect.value} ${sizeName}사이즈${optionsText} ${quantity}잔, 총 ${total.toLocaleString()}원 주문이 접수되었습니다!`;
    orderMessage.hidden = false;
  } catch (error) {
    // 저장 실패 시 사용자에게 안내하고 에러를 콘솔에 남깁니다.
    alert('주문 저장에 실패했어요');
    console.error('주문 저장 중 에러 발생:', error);
  } finally {
    // 저장이 끝나면 버튼을 다시 활성화해 다음 주문을 받을 준비를 합니다.
    setSubmitButtonLoading(false);
  }
});

// 다시 작성 버튼을 누르면 초기화된 입력값에 맞춰 금액과 메시지를 갱신합니다.
orderForm.addEventListener('reset', () => {
  // reset 이벤트가 끝난 다음 브라우저가 입력값을 초기화하므로 잠시 기다립니다.
  window.setTimeout(() => {
    updateEstimatedPrice();
    orderMessage.textContent = '';
    orderMessage.hidden = true;
  }, 0);
});

// 페이지를 처음 열었을 때도 현재 입력값에 맞는 금액을 보여줍니다.
updateEstimatedPrice();
