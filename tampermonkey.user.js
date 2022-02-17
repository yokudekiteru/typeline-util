// ==UserScript==
// @name         TYPELINE Util
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  TYPELINEの挙動を変えるためのスクリプト
// @author       You
// @include      https://dashboard.media.play.jp/*
// @include      https://typeline-test.streaks.jp/*
// @icon         https://www.google.com/s2/favicons?domain=play.jp
// @grant        none
// ==/UserScript==
/**
【機能一覧】
[記事一覧]
・行のどこかをクリックすればチェックが入るように
・チェックを入れたアイテムをCtrl+Enterで一気に開く（※要ポップアップブロック解除）

[記事編集]
・テキスト入力欄のフォントを MS Gothic に（等幅かつクオーテーションの向き判別可能）
・タイトル、サブタイトル、要約の入力欄を強調
・配信先確認を促すボタンの設置、配信先タブを強調（新規作成時と原稿から記事化した直後タイトル未定時に）
・記事作成ページから画像・動画のアップロードボタンを消し去る
・アセット選択画面(画像・動画どちらも)で、行のどこかをダブルクリックすれば設定前確認画面（選んで「保存するボタン」を押したのと同じ状態）に
・アセット設定前確認ポップアップでCtrl+Enter or 画面のどこかをダブルクリックで「設定する」をクリックと等価に(アセット設定）
・公開期限設定の便利ボタンを追加
・配信先の「すべてに配信」を除去

[記事詳細=中間画面]
・記事詳細でCtrl+Enter or 画面のどこかをダブルクリックで「記事データの編集」をクリックと等価に（編集画面を開く）

[原稿一覧]
・「使用不可」行をグレーアウト
・行のどこかをクリックすればチェックが入るように
・チェックを入れたアイテムをCtrl+Enterで一気に開く（※要ポップアップブロック解除）

[原稿詳細]
・Ctrl+Enter or 画面のどこかをダブルクリックで「記事化」ボタンのクリックと等価に（ポップアップを開く）
・記事化ポップアップにて Ctrl+Enter or 画面のどこかをダブルクリックで「記事化」をクリックと等価に（記事化の実行）

[アセットアップロード]
・動画ファイルをアップロードできないように
*/
(function() {
  'use strict';

  function clickManuscriptToArticle() {
    // 原稿詳細で「記事化」ボタンをクリック
    if (location.href.indexOf('/typeline/manuscripts/') > -1) {
      // ポップアップ表示中か否かでクリックすべき「記事化」ボタンが異なる
      // ポップアップ中の「記事化」ボタンを優先処理
      let buttons = document.querySelectorAll('.MuiDialog-container button');
      if (buttons.length === 0) {
        buttons = document.querySelectorAll('button');
      }
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].innerText === '記事化') {
          buttons[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function clickEditArticle() {
    // 記事詳細で「記事データの編集」ボタンをクリック
    if (location.href.indexOf('/typeline/articles/') > -1) {
      // なぜかこのボタンはaタグでつくられているので、予めbutton化に備えておく
      let buttons = document.querySelectorAll('a[type="button"],button');
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].innerText === '記事データの編集') {
          buttons[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function clickSetArticleAsset() {
    // 記事詳細でアセットを「設定する」ボタンをクリック
    if (location.href.indexOf('/typeline/article') > -1) {
      let buttons = document.querySelectorAll('.MuiDialog-container button');
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].innerText === '設定する') {
          buttons[i].click();
          return true;
        }
      }
    }
    return false;
  }

  function openListItems() {
    // テーブルでチェックが入った行のリンクをまとめて開く
    document.querySelectorAll('tr.pmpui-table-row').forEach(function(el) {
      if (el.children.item(0).querySelector('input[type="checkbox"]').checked) {
        window.open(el.querySelector('a').href);
      }
    });
  }

  function getParentTr(el) {
    if (el === null) {
      return null;
    }
    if (el.tagName.toLowerCase() === 'tr') {
      return el;
    }
    return getParentTr(el.parentNode);
  }

  function selectAssetByClickTr(ev) {
    let myTr = getParentTr(ev.target);
    if (myTr !== null) {
      myTr.querySelector('input[type="radio"],input[type="checkbox"]').click();
    }
  }

  function selectAssetByDblclickTr(ev) {
    selectAssetByClickTr(ev);
    let buttons = document.querySelectorAll('.MuiDialog-container button');
    for (let i = 0; i < buttons.length; i++) {
      if (buttons[i].innerText === '保存する') {
        buttons[i].click();
        break;
      }
    }
  }

  window.addEventListener('keydown', function(ev) {
    if (ev.ctrlKey && ev.key === 'Enter') {
      if (clickManuscriptToArticle()) return;
      if (clickEditArticle()) return;
      if (clickSetArticleAsset()) return;
      openListItems();
    }
  });

  window.addEventListener('dblclick', function(ev) {
    if (clickManuscriptToArticle()) return;
    if (clickEditArticle()) return;
    if (clickSetArticleAsset()) return;
  });

  var observer = new MutationObserver(function() {
    if (location.href.indexOf('/typeline/article/creation/NoTemplate') > -1) {
      //location.href = location.href.replace('/NoTemplate', ''); // テンプレート未指定の記事作成を封じる→無効とする
    }
    // 記事詳細のアセット選択で行クリックでラジオOn
    // ダブルクリックでラジオOn→保存まで
    document.querySelectorAll('.master-table-asset tr').forEach(function(el) {
      if (el.injectEvent === undefined) {
        el.addEventListener('click', selectAssetByClickTr);
        el.addEventListener('dblclick', selectAssetByDblclickTr);
        el.injectEvent = true;
      }
    });

    if (location.href.indexOf('/typeline/article') > -1) {
      // 記事作成画面

      // フォント・背景色等
      document.querySelectorAll('textarea').forEach(function(el) {
        el.style.fontFamily = 'MS Gothic';
        if (el.name === 'title') {
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = 'plum';
        } else if (el.name === 'sub_title') {
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = 'lightpink';
        } else if (el.name === 'summary') {
          el.style.fontWeight = 'bold';
          el.style.backgroundColor = 'lightgreen';
        }
      });
      document.querySelectorAll('.rdw-editor-main').forEach(function(el) {
        el.style.fontFamily = 'MS Gothic';
      });

      // 入力補助コントロール
      document.querySelectorAll('.publish-period-form').forEach(function(el) {
        if (el.injectButton === undefined) {
          el.injectButton = true;
          ['１週間', '１ヵ月', '１年', '年末'].forEach(function(x) {
            const btn = document.createElement('button');
            btn.innerText = x;
            btn.classList.add('pmpui-button');
            btn.classList.add('pmpui-button-size-small');
            btn.addEventListener('click', function(ev) {
              let dateTo = new Date();
              if (ev.target.innerText === '１週間') {
                dateTo.setDate(dateTo.getDate() + 7);
              } else if (ev.target.innerText === '１ヵ月') {
                dateTo.setMonth(dateTo.getMonth() + 1);
              } else if (ev.target.innerText === '１年') {
                dateTo.setFullYear(dateTo.getFullYear() + 1);
              } else {
                dateTo.setMonth(11);
                dateTo.setDate(31);
              }
              let tmpDateTo = dateTo.toLocaleString().split(' ')[0].split('/');
              let strDateTo = tmpDateTo[0] + '/' + ('0' + tmpDateTo[1]).slice(-2) + '/' + ('0' + tmpDateTo[2]).slice(-2);
              document.execCommand('copy');
              navigator.clipboard.writeText(strDateTo).then(function() {
                document.querySelectorAll('.pmpui-date-picker input')[1].select();
              });
            });
            el.appendChild(btn);
          });
          let lbl = document.createElement('label');
          lbl.style.fontSize = '0.8em';
          lbl.innerText = '※ボタンをClickで日付がクリップボードに入るのでCtrl+vでPasteしてください';
          el.appendChild(lbl);
        }
      });

      document.querySelectorAll('button').forEach(function(el) {
        if (el.textContent === 'アップロード') {
          el.style = 'visibility: hidden;';
        }
      });

      document.querySelectorAll('.pmpui-radio-button').forEach(function(el) {
        if (el.textContent.indexOf('すべてに配信') > -1 && el.forceHidden === undefined) {
          el.forceHidden = true;
          el.style = 'visibility: hidden;';
        }
      });

      document.querySelectorAll('.pmpui-radio-button').forEach(function(el) {
        if (el.textContent.indexOf('個別に配信') > -1 && el.forceClicked === undefined) {
          el.forceClicked = true;
          el.querySelector('input').click();
        }
      });

      document.querySelectorAll('.pmpui-dropdown-items li').forEach(function(el) {
        if (el.textContent === 'すべて') {
          el.remove();
        }
      });

      // 配信先指定未指定対策
      if (document.querySelector('.pmpui-breadcrumb-group li') !== null
        && (document.querySelector('.pmpui-breadcrumb-group li:last-child').innerText === '記事の作成'
          || document.querySelector('.pmpui-breadcrumb-group li:nth-last-child(2)').innerText.indexOf('＜未定義＞') === 0)) {
        let sidebarLi = document.querySelectorAll('.pmpui-sidebar-control li');
        for (let i = 0; i < sidebarLi.length; i++) {
          if (sidebarLi[i].innerText === '配信先' && sidebarLi[i].alertInjected !== true) {
            sidebarLi[i].style.backgroundColor = 'gold';
            const alertBtn = document.createElement('button');
            alertBtn.id = 'distribution-alert-button';
            alertBtn.classList.add('pmpui-button');
            alertBtn.classList.add('pmpui-button-size-normal');
            alertBtn.innerText = 'の前に配信先確認！';
            alertBtn.style.borderColor = 'goldenrod';
            alertBtn.style.backgroundColor = 'gold';
            alertBtn.addEventListener('click', function(ev) {
              sidebarLi[i].querySelector('button').click();
              /*
              sidebarLi[i].style.backgroundColor = 'inherit';
              alertBtn.remove();
              */
            });
            document.querySelector('.pmpui-form__actions .pmpui-util-action-stripe-group').appendChild(alertBtn);
            sidebarLi[i].alertInjected = true;
            break;
          }
        }
      }

      // 初期値設定
      let priority = document.querySelector('input[name="custom_data.priority"]');
      if (priority && priority.value === '') { priority.value = 'B'; }
    } else if (location.href.indexOf('/typeline/assets') > -1) {
      // アセット一覧
      /* 登録を封じる→無効化
      document.querySelectorAll('a[href$=new]').forEach(function(el) {
        el.remove();
      });
      */
      // 画像のみに限定
      document.querySelector('input[type="file"]').accept = 'image/jpeg,image/png';
    } else if (location.href.indexOf('/typeline/manuscripts') > -1) {
      // 原稿一覧
      /* 使用不可行の色を変更 */
      document.querySelectorAll('tr.pmpui-table-row').forEach(function(el) {
        if (el.children.item(3).textContent === '不可') {
          el.style.backgroundColor = 'gainsboro';
        } else {
          el.style.backgroundColor = 'inherit';
        }
      });
    }
  });
  observer.observe(document, {childList: true, subtree: true});
})();