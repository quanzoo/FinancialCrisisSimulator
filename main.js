// Chartをグローバル変数で宣言
var myChart;
var rets;
var assets;


async function loadData() {
        // データ読み込み
    var url_rets = "https://quanzoo.github.io/PortfolioOptimizer/data/returns.csv";
    rets = await loadCSV(url_rets)
    assets = rets[0].slice(1)

    // 初期値の入力
    for (var a of assets){
    if (a == "TP"){
        document.querySelector("input#wgt_" + a).value = 20;
    } else {
        document.querySelector("input#wgt_" + a).value = 10;
    }
    }

    document.querySelector("input#wgt_sum").value = 100;
}

loadData()


// ドキュメントが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', () => {
    // すべてのnumber入力要素を取得
    const inputs = document.querySelectorAll('.wgt');
  
    // 合計を計算して出力する関数
    function updateSum() {
        const inputs = document.querySelectorAll('.wgt');
        const output = document.getElementById('wgt_sum');
  
        let sum = 0;
        inputs.forEach(input => {
            const value = Number(input.value) || 0; // 空の場合は0として扱う
            sum += value;
        });
        output.value = sum;
    }
  
    // 各入力にイベントリスナーを追加
    inputs.forEach(input => {
        input.addEventListener('input', updateSum);
    });
  
    // 初期表示時の合計を計算
    updateSum();
  });
  
async function loadCSV(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        const rets = text.split('\n').map(row => row.split(','));
        return rets;
    } catch (error) {
        console.error('Error loading CSV:', error);
    }
}


function loadCSV2(url) {
    var xhr = new XMLHttpRequest();
    var rets = [];
    
    xhr.open('GET', url, false); // falseで同期処理
    xhr.send();    
    if (xhr.status === 200) { // 成功
        var text = xhr.responseText;
        rets = text.split('\n').map(row => row.split(','));
    } else {
        console.error('Error loading CSV. Status:', xhr.status);
    }
    return rets;
}



function filterByDateRange(rets, startDateStr, endDateStr) {
  // 日付文字列をDateオブジェクトに変換
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  
  // フィルタリング
  const filteredRets = rets.filter(row => {
      // 各行の1要素目（インデックス0）の日付をDateオブジェクトに変換
      const rowDate = new Date(row[0]);
      
      // 日付が範囲内かどうかをチェック
      return rowDate >= startDate && rowDate <= endDate;
  });
  
  return filteredRets;
}

function calculatePortfolioReturns(wgt, rets) {
  // ポートフォリオのリターンを格納する配列
  const port_rets = [];
  
  // retsの各行に対して計算
  for (let i = 0; i < rets.length; i++) {
      const date = rets[i][0]; // 日付
      let portfolioReturn = 0;
      
      // 各資産のリターンとウェイトを掛けて合計
      for (let j = 0; j < wgt.length; j++) {
          // rets[i][j+1]は日付の次の要素から始まるリターン
          portfolioReturn += Number(rets[i][j + 1]) * Number(wgt[j]);
      }
      
      port_rets.push([date, portfolioReturn]);
  }
  
  return port_rets;
}

function getNextDate(rets, targetDate) {
  // retsの各行の日付を確認
  for (let i = 0; i < rets.length - 1; i++) {
      if (rets[i][0] === targetDate) {
          // 次の行の日付を返す
          return rets[i + 1][0];
      }
  }
  
  // 見つからない場合や最後の行の場合はnullを返す
  return null;
}

function calculateCumulativeReturns(rets) {
  // 資産の数（日付列を除く）
  const numAssets = rets[0].length - 1;
  // 累積リターンを格納する配列を初期化（各資産ごとに1で初期化）
  const cumulativeReturns = Array(numAssets).fill(1);
  
  // 各日付のデータを処理
  for (let i = 0; i < rets.length; i++) {
      // 日付を除くリターンの部分（インデックス1以降）
      const dailyReturns = rets[i].slice(1);
      
      // 各資産のリターンを累積
      for (let j = 0; j < numAssets; j++) {
          cumulativeReturns[j] *= (1 + Number(dailyReturns[j]));
      }
  }
  
  // 最後に-1してリターンの形式に変換
  return cumulativeReturns.map(cumRet => cumRet - 1);
}

function calculatePriceSeries(rets,initialDateStr, initialValue = 100) {
  const priceSeries = [];
  const prevPrices = Array(rets[0].length - 1).fill(initialValue);
  priceSeries.push([initialDateStr, ...prevPrices]);
  
  for (let i = 0; i < rets.length; i++) {
      const date = rets[i][0];
      const dailyReturns = rets[i].slice(1);
      const dailyPrices = [];
      
      for (let j = 0; j < dailyReturns.length; j++) {
          const price = prevPrices[j] * (1 + Number(dailyReturns[j]));
          prevPrices[j] = price; // 次の計算のために保存
          dailyPrices.push(price);
      }
      
      priceSeries.push([date, ...dailyPrices]);
  }
  
  return priceSeries;
}

function mergeSeries(s1, s2) {
  // rets1をベースに、新しい配列を作成
  const mergedRets = s1.map((row1, index) => {
      const row2 = s2[index];
      
      // 日付が一致するか確認（必要に応じて）
      if (row1[0] !== row2[0]) {
          throw new Error(`Date mismatch at index ${index}: ${row1[0]} vs ${row2[0]}`);
      }
      
      // 日付を保持しつつ、リターンを結合
      return [row1[0], ...row1.slice(1), ...row2.slice(1)];
  });
  
  return mergedRets;
}

function Simulation(){

  document.querySelector("div#error").style.display = "None";

  // ウエイト取得
  var wgt =[];
  for (let i=0; i<assets.length; i++){
    wgt[i] = parseFloat(document.querySelector("input#wgt_" + assets[i]).value)/100;
  }

  var initialDateStr = "2007/6/29"
  startDateStr = getNextDate(rets, initialDateStr)
  var endDateStr = "2009/2/27"

  console.log(rets)


  filteredRets = filterByDateRange(rets, startDateStr, endDateStr)

  console.log(filteredRets)

  assetCumRet = calculateCumulativeReturns(filteredRets)

  portRets = calculatePortfolioReturns(wgt, filteredRets)
  portCumRet = calculateCumulativeReturns(portRets)

  document.querySelector("div#output").style.display = "block";

  document.querySelector("td#ret_port").textContent = (Math.round(portCumRet*1000)/10).toFixed(1) + "%"

  for (let i=0; i<assets.length; i++){
    document.querySelector("td#ret_" + assets[i]).textContent = (Math.round(assetCumRet[i]*1000)/10).toFixed(1) + "%"
  }

  allRets = mergeSeries(portRets, filteredRets)
  priceSeries = calculatePriceSeries(allRets, initialDateStr, initialValue=100)

  console.log(priceSeries)

  var labels = []
  labels[0] = "ポートフォリオ"
  for (let i=0; i<assets.length; i++){
    labels[i+1] = document.querySelector("th#name_" + assets[i]).textContent;
  }
  // Chart.jsでグラフを作成
  const ctx = document.getElementById('myChart').getContext('2d');
  if (myChart) {
    myChart.destroy();
  }

  myChart = new Chart(ctx, {
      type: 'line', // 折れ線グラフ
      data: {
          labels: priceSeries.map(row => row[0]), // X軸の日付
          datasets: (() => {
              const datasets = [];
              const numAssets = priceSeries[0].length - 1;
              
              // 各資産ごとにデータセットを作成
              for (let i = 0; i < numAssets; i++) {
                  datasets.push({
                      label: labels[i], // 凡例のラベル
                      data: priceSeries.map(row => row[i + 1]), // 価格データ
                      borderColor: `hsl(${i * 360 / numAssets}, 70%, 50%)`, // 色を自動生成
                      fill: false,
                      tension: 0.1 // 線の滑らかさ
                  });
              }
              return datasets;
          })()
      },
      options: {
          responsive: true,
          scales: {
              x: {
                  title: {
                      display: true,
                      text: 'Date'
                  }
              },
              y: {
                  title: {
                      display: true,
                      text: 'Price'
                  },
                  beginAtZero: false
              }
          },
          plugins: {
              legend: {
                  display: true // 凡例を表示
              }
          }
      }
  });

  }


