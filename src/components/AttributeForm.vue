<template>
    <Modal
        v-model:visible="visible"
        title="货架信息"
        okText="提交"
        cancelText="取消"
        @ok="handleOk"
        @cancel="handleCancel"
    >
        <Form
            :model="formState"
            :label-col="{ span: 6 }"
            :wrapper-col="{ span: 18 }"
            autocomplete="off"
        >
            <FormItem
                label="UID"
                name="uid"
                :rules="[{ required: true, message: '请输入uid' }]"
            >
                <Input v-model:value="formState.uid" />
            </FormItem>

            <FormItem
                label="货架类型"
                name="type"
                :rules="[{ required: true, message: '请输入货架类型' }]"
            >
                <Input v-model:value="formState.type" />
            </FormItem>
        </Form>
    </Modal>
</template>

<script setup lang="ts">
    import { reactive, watch, ref } from 'vue';
    import { Button, Form, FormItem, Input, Modal } from 'ant-design-vue';

    const visible = ref(false);
    const emit = defineEmits(['success', 'close']);
    const props = defineProps<{
        uid?: string,
        type?: string,
        modelVisible?: boolean,
    }>();

    watch(
        () => props,
        (val) => {
            console.log(props, '=====')
            formState.uid = val.uid;
            formState.type = val.type;
            visible.value = val.modelVisible;
            // TODO：如果UID存在，则调用接口获取此uid的信息展示
        },
        { deep: true }
    );

    const formState = reactive<FormState>({
        uid: '',
        type: '',
    });

    // 取消
    const handleCancel = () => {
        emit('close', false);
    }

    // 保存
    const handleOk = () => {
        console.log(formState)
        emit('close', false);
        emit('success', formState);
    };
  
</script>
  